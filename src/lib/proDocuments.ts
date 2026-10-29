import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

// Pro documents (ID, police certificate, licences, certificates, insurance) with expiry dates:
//   - the pro sees every document and its status, and submits new or replacement ones; nothing changes until an admin
//     approves (target: within 24-48 hours), then the new one replaces the old;
//   - reminders before expiry (days configurable in Admin > Documents, default 30, 14 and 7 days) and on the day;
//   - a mandatory document (default: the ID) expired past the grace period pauses job alerts and bidding until a renewed
//     one is approved; the pro is told why and what to do.
// Documents are visible only to the pro and to admins.

export const DOC_TYPES = ["ID", "POLICE", "LICENSE", "CERTIFICATE", "INSURANCE", "OTHER"] as const;
export type DocType = (typeof DOC_TYPES)[number];
const DAY = 24 * 60 * 60 * 1000;

export type DocStatusView = "VALID" | "EXPIRING_SOON" | "EXPIRED" | "PENDING" | "REJECTED" | "SUPERSEDED";

export async function docSettings() {
  const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { docAlertDays: true, docGraceDays: true, docMandatoryTypes: true } }).catch(() => null);
  const alertDays = (s?.docAlertDays ?? "30,14,7")
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => b - a);
  const mandatory = (s?.docMandatoryTypes ?? "ID").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
  return { alertDays, graceDays: s?.docGraceDays ?? 7, mandatory };
}

/** What to show the pro for one document. */
export function viewStatus(d: { status: string; expiresAt: Date | null }, alertDays: number[], now = new Date()): DocStatusView {
  if (d.status === "PENDING" || d.status === "REJECTED" || d.status === "SUPERSEDED") return d.status;
  if (!d.expiresAt) return "VALID";
  const left = d.expiresAt.getTime() - now.getTime();
  if (left < 0) return "EXPIRED";
  if (left <= (alertDays[0] ?? 30) * DAY) return "EXPIRING_SOON";
  return "VALID";
}

/** Accounts made before the documents section existed: their ID and police certificate become approved documents once. */
export async function backfillDocuments(providerId: string) {
  const [p, count] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { id: providerId }, select: { cnicUrl: true, policeCertUrl: true, isVerified: true, cnicOcr: true } }),
    prisma.providerDocument.count({ where: { providerId } }),
  ]);
  if (!p || count > 0) return;
  const status = p.isVerified ? "APPROVED" : "PENDING";
  const rows = [
    p.cnicUrl ? { providerId, type: "ID", label: "Identity document", fileUrl: p.cnicUrl, status } : null,
    p.policeCertUrl ? { providerId, type: "POLICE", label: "Police certificate", fileUrl: p.policeCertUrl, status } : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null);
  if (rows.length) await prisma.providerDocument.createMany({ data: rows });
}

async function notifyAdmins(title: string, body: string) {
  const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPPORT"] } }, select: { id: true } });
  await Promise.allSettled(admins.map((a) => notify({ userId: a.id, type: "SYSTEM", title, body, linkUrl: "/admin/documents" })));
}

export async function submitDocument(providerId: string, userId: string, input: { type: DocType; label: string; fileUrl: string; expiresAt: Date | null }) {
  const doc = await prisma.providerDocument.create({ data: { providerId, ...input, status: "PENDING" } });
  await notify({
    userId,
    type: "SYSTEM",
    title: "Document submitted for review",
    body: `"${input.label}" will be checked by the Servigic team, usually within 24-48 hours. Your current document stays valid until then.`,
    linkUrl: "/pro/profile",
  }).catch(() => null);
  await notifyAdmins("Pro document waiting for review", `${input.label} (${input.type}) needs approval.`).catch(() => null);
  return doc;
}

/** Recomputes whether a pro's job access is paused for an expired mandatory document, and tells him when it changes. */
export async function refreshDocumentBlock(providerId: string, now = new Date()) {
  const { mandatory, graceDays } = await docSettings();
  const profile = await prisma.providerProfile.findUnique({ where: { id: providerId }, select: { userId: true, documentsBlockedAt: true } });
  if (!profile) return;
  const approved = await prisma.providerDocument.findMany({ where: { providerId, status: "APPROVED", type: { in: mandatory } }, select: { type: true, label: true, expiresAt: true } });
  // A mandatory type is fine when at least one approved document of that type is still within its grace period.
  const lapsed = mandatory.filter((type) => {
    const ofType = approved.filter((d) => d.type === type);
    if (ofType.length === 0) return false; // never had one: handled by verification, not by expiry
    return ofType.every((d) => d.expiresAt && d.expiresAt.getTime() + graceDays * DAY < now.getTime());
  });
  if (lapsed.length > 0 && !profile.documentsBlockedAt) {
    const reason = `Expired document: ${lapsed.join(", ")}`;
    await prisma.providerProfile.update({ where: { id: providerId }, data: { documentsBlockedAt: now, documentsBlockedReason: reason } });
    await notify({
      userId: profile.userId,
      type: "SYSTEM",
      title: "Job access paused: document expired",
      body: "A required document has expired, so you will not get new jobs or be able to bid for now. Upload the renewed document in Account > My documents; access comes back as soon as it is approved.",
      linkUrl: "/pro/profile",
      channels: ["email"],
    }).catch(() => null);
  } else if (lapsed.length === 0 && profile.documentsBlockedAt) {
    await prisma.providerProfile.update({ where: { id: providerId }, data: { documentsBlockedAt: null, documentsBlockedReason: null } });
    await notify({ userId: profile.userId, type: "SYSTEM", title: "Job access restored", body: "Your renewed document was approved. You can receive jobs and bid again.", linkUrl: "/pro/jobs" }).catch(() => null);
  }
}

export async function reviewDocument(docId: string, adminId: string, decision: { approve: true } | { approve: false; reason: string }) {
  const doc = await prisma.providerDocument.findUnique({ where: { id: docId }, include: { provider: { select: { id: true, userId: true } } } });
  if (!doc || doc.status !== "PENDING") throw new Error("This document is not waiting for review");
  if (decision.approve) {
    await prisma.$transaction([
      prisma.providerDocument.updateMany({ where: { providerId: doc.providerId, type: doc.type, label: doc.label, status: "APPROVED" }, data: { status: "SUPERSEDED" } }),
      prisma.providerDocument.update({ where: { id: docId }, data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: adminId, rejectReason: null, lastExpiryAlert: null } }),
      // The profile keeps pointing to the current ID / police certificate (used by verification screens).
      ...(doc.type === "ID" ? [prisma.providerProfile.update({ where: { id: doc.providerId }, data: { cnicUrl: doc.fileUrl } })] : []),
      ...(doc.type === "POLICE" ? [prisma.providerProfile.update({ where: { id: doc.providerId }, data: { policeCertUrl: doc.fileUrl } })] : []),
    ]);
    await notify({ userId: doc.provider.userId, type: "SYSTEM", title: "Document approved", body: `"${doc.label}" was approved and is now your active document.`, linkUrl: "/pro/profile" }).catch(() => null);
    await refreshDocumentBlock(doc.providerId);
  } else {
    await prisma.providerDocument.update({ where: { id: docId }, data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: adminId, rejectReason: decision.reason } });
    await notify({
      userId: doc.provider.userId,
      type: "SYSTEM",
      title: "Document not approved",
      body: `"${doc.label}" was not approved: ${decision.reason}. Please upload a corrected, clear copy in Account > My documents.`,
      linkUrl: "/pro/profile",
    }).catch(() => null);
  }
}

/** Daily-ish sweep (job-health cron): expiry reminders, the reminder on the day, and pausing access past the grace period. */
export async function sweepDocumentExpiry(now = new Date()): Promise<{ reminders: number; checked: number }> {
  const { alertDays } = await docSettings();
  const horizon = new Date(now.getTime() + (alertDays[0] ?? 30) * DAY);
  const docs = await prisma.providerDocument.findMany({
    where: { status: "APPROVED", expiresAt: { not: null, lte: horizon } },
    include: { provider: { select: { id: true, userId: true } } },
    take: 500,
  });
  let reminders = 0;
  const touched = new Set<string>();
  for (const d of docs) {
    touched.add(d.providerId);
    const daysLeft = Math.ceil((d.expiresAt!.getTime() - now.getTime()) / DAY);
    // The tightest reminder due now: "0" on/after the day, else the smallest configured day count not above daysLeft.
    const due = daysLeft <= 0 ? "0" : String(alertDays.filter((n) => daysLeft <= n).sort((a, b) => a - b)[0] ?? "");
    // Reminders only move forward (30 -> 14 -> 7 -> on the day), each sent once.
    if (!due || (d.lastExpiryAlert !== null && Number(due) >= Number(d.lastExpiryAlert))) continue;
    const expires = d.expiresAt!.toISOString().slice(0, 10);
    await notify({
      userId: d.provider.userId,
      type: "SYSTEM",
      title: due === "0" ? `${d.label} has expired` : `${d.label} expires in ${daysLeft} days`,
      body:
        due === "0"
          ? `Your ${d.label} expired on ${expires}. Upload the renewed document in Account > My documents to keep receiving jobs.`
          : `Your ${d.label} expires on ${expires}. Upload the renewed document in Account > My documents so your service is not interrupted.`,
      linkUrl: "/pro/profile",
    }).catch(() => null);
    await prisma.providerDocument.update({ where: { id: d.id }, data: { lastExpiryAlert: due } });
    reminders++;
  }
  for (const providerId of touched) await refreshDocumentBlock(providerId, now);
  return { reminders, checked: docs.length };
}
