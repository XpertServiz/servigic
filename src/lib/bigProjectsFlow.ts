import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toE164 } from "@/lib/phone";
import { isLocale } from "@/i18n/locales";
import { notify } from "@/lib/notify";
import { sendEmailChannel } from "@/lib/notify/channels/email";
import {
  BUDGET_BANDS, PROJECT_TRADES, PROJECT_TYPES, PROPERTY_STAGES, START_WINDOWS,
  adminRecipients, emailCustomerReceived, emailNewProject, nextReference,
  notifyAdmins,
} from "@/lib/bigProjects";

const keys = (l: readonly (readonly [string, string])[]) => l.map(([k]) => k) as [string, ...string[]];
const text = (max: number) => z.string().trim().max(max);

/** What the website form and the Customer app send. */
export const requestSchema = z.object({
  trades: z.array(z.enum(keys(PROJECT_TRADES))).min(1).max(11),
  projectType: z.enum(keys(PROJECT_TYPES)).optional(),
  city: text(60).min(2),
  area: text(80).optional(),
  name: text(80).min(2),
  phone: text(30).min(5),
  email: z.string().trim().email().max(120),
  propertyStage: z.enum(keys(PROPERTY_STAGES)).optional(),
  areaSqft: z.number().int().min(50).max(1_000_000).optional(),
  floors: z.number().int().min(1).max(60).optional(),
  budgetBand: z.enum(keys(BUDGET_BANDS)).optional(),
  startWindow: z.enum(keys(START_WINDOWS)).optional(),
  notes: text(1000).optional(),
  preferredContact: z.enum(["call", "whatsapp", "both"]).optional(),
  bestTime: z.enum(["morning", "afternoon", "evening", "anytime"]).optional(),
  consent: z.literal(true),
  language: text(8).optional(),
  website: z.string().optional(), // honeypot
  cf: z.string().max(4096).optional(), // Cloudflare Turnstile token (only checked when TURNSTILE_SECRET_KEY is set)
});
export type ProjectRequest = z.infer<typeof requestSchema>;

/** Cloudflare Turnstile: passes when no secret key is configured (honeypot + rate limits still apply). */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret, response: token, remoteip: ip }) });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch { return false; }
}

export const sha = (s: string) => createHash("sha256").update(`${s}|${process.env.AUTH_SECRET ?? "servigic"}`).digest("hex").slice(0, 32);

/** Saves a request (website or app), flags a possible duplicate, emails the admin and the customer. Returns null when the phone is invalid. */
export async function submitProject(d: ProjectRequest, meta: { source: "web" | "app"; userId?: string; ipKey: string }) {
  const phone = toE164(d.phone, "PK");
  if (!phone) return null;
  const dup = await prisma.bigProject.findFirst({
    where: { customerPhone: phone, city: { equals: d.city, mode: "insensitive" }, trades: { hasSome: d.trades }, createdAt: { gt: new Date(Date.now() - 7 * 86400_000) } },
    select: { id: true },
  });
  let project = null;
  for (let i = 0; i < 5 && !project; i++) {
    try {
      project = await prisma.bigProject.create({
        data: {
          reference: await nextReference(), source: meta.source, locale: d.language && isLocale(d.language) ? d.language : "en", country: "PK",
          city: d.city, area: d.area || null, customerUserId: meta.userId ?? null, customerName: d.name, customerPhone: phone, customerEmail: d.email.toLowerCase(),
          preferredContact: d.preferredContact ?? null, bestTime: d.bestTime ?? null, projectType: d.projectType ?? null, propertyStage: d.propertyStage ?? null,
          areaSqft: d.areaSqft ?? null, floors: d.floors ?? null, budgetBand: d.budgetBand ?? null, startWindow: d.startWindow ?? null, notes: d.notes || null,
          trades: d.trades, consentAt: new Date(), ipHash: sha(meta.ipKey), duplicateOf: dup?.id ?? null,
          events: { create: { actor: "customer", type: "created", body: dup ? "Possible duplicate of an earlier request" : null } },
        },
      });
    } catch (e) {
      if (i === 4) throw e;
    }
  }
  await Promise.all([emailNewProject(project!), emailCustomerReceived(project!), notifyAdmins(project!)]);
  return project!;
}

// ---- estimates -------------------------------------------------------------------------------------------------------------
export const estimateItemSchema = z.object({
  trade: z.string().trim().max(40).optional(),
  description: z.string().trim().min(1).max(300),
  unit: z.string().trim().max(20).default("job"),
  qty: z.number().positive().max(1e7),
  unitPrice: z.number().min(0).max(1e9),
  materialsBy: z.enum(["customer", "servigic"]).default("servigic"),
});
export type EstimateItem = z.infer<typeof estimateItemSchema>;

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "https://www.servigic.com").replace(/\/$/, "");
export const estimateLink = (token: string) => `${appUrl()}/e/${token}`;

/** Sends a new estimate version (older ones are superseded) to the customer by email, push and the app. */
export async function sendEstimate(projectId: string, actor: string, input: { items: EstimateItem[]; discount: number; validUntil: Date | null; terms: string | null }) {
  const p = await prisma.bigProject.findUnique({ where: { id: projectId } });
  if (!p) throw new Error("not found");
  const subtotal = input.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const total = Math.max(0, subtotal - input.discount);
  const last = await prisma.bigProjectEstimate.findFirst({ where: { projectId }, orderBy: { version: "desc" }, select: { version: true } });
  const token = randomBytes(24).toString("hex");
  const est = await prisma.$transaction(async (tx) => {
    await tx.bigProjectEstimate.updateMany({ where: { projectId, status: { in: ["sent", "revision_requested"] } }, data: { status: "superseded" } });
    const e = await tx.bigProjectEstimate.create({
      data: { projectId, version: (last?.version ?? 0) + 1, currency: p.currency, items: input.items, subtotal, discount: input.discount, total, validUntil: input.validUntil, terms: input.terms, token },
    });
    await tx.bigProject.update({ where: { id: projectId }, data: { contractAmount: total, ...(["new", "contacted", "site_visit_scheduled"].includes(p.status) ? { status: "estimate_sent" } : {}), ...(p.firstContactedAt ? {} : { firstContactedAt: new Date() }) } });
    await tx.bigProjectEvent.create({ data: { projectId, actor, type: "estimate", body: `Estimate v${e.version} sent: ${p.currency} ${total}`, data: { estimateId: e.id } } });
    return e;
  });
  const link = estimateLink(token);
  const html = `<div style="background:#0A0808;padding:24px;font-family:Arial,sans-serif;color:#f4efe6"><div style="max-width:560px;margin:0 auto;background:#16110f;border:1px solid #2a211c;border-radius:14px;padding:22px"><div style="color:#F5A623;font-weight:700;font-size:18px;margin-bottom:12px">Servigic</div><h2 style="margin:0 0 10px">Your estimate is ready</h2><p>Reference ${p.reference}. Total: <b>${p.currency} ${total.toLocaleString("en-US")}</b>${input.validUntil ? `, valid until ${input.validUntil.toDateString()}` : ""}.</p><p><a href="${link}" style="display:inline-block;padding:11px 18px;border-radius:999px;background:#F5A623;color:#1a1208;text-decoration:none;font-weight:700">View estimate</a></p></div></div>`;
  await sendEmailChannel({ to: p.customerEmail, subject: `Your estimate ${p.reference} is ready`, body: `Your estimate for ${p.reference} is ready: ${link}`, html }).catch(() => null);
  if (p.customerUserId) await notify({ userId: p.customerUserId, type: "STATUS_UPDATE", title: "Your estimate is ready", body: `${p.reference}: ${p.currency} ${total.toLocaleString("en-US")}`, linkUrl: `/projects/${p.id}` }).catch(() => null);
  return est;
}

/** Customer answers the latest estimate. */
export async function respondEstimate(estimateId: string, action: "accept" | "revise" | "decline", comment: string | null) {
  const est = await prisma.bigProjectEstimate.findUnique({ where: { id: estimateId }, include: { project: true } });
  if (!est) return { ok: false as const, error: "Not found" };
  if (est.status !== "sent") return { ok: false as const, error: "This estimate was already answered or replaced." };
  if (action === "accept" && est.validUntil && est.validUntil.getTime() < Date.now()) return { ok: false as const, error: "This estimate has expired. Please ask Servigic for a new one." };
  const status = action === "accept" ? "accepted" : action === "revise" ? "revision_requested" : "declined";
  const projStatus = action === "accept" ? "accepted" : action === "revise" ? "negotiating" : "lost";
  await prisma.$transaction([
    prisma.bigProjectEstimate.update({ where: { id: estimateId }, data: { status, respondedAt: new Date(), customerComment: comment } }),
    prisma.bigProject.update({ where: { id: est.projectId }, data: { status: projStatus, ...(action === "decline" ? { lostReason: "price" } : {}) } }),
    prisma.bigProjectEvent.create({ data: { projectId: est.projectId, actor: "customer", type: "estimate", body: `Customer ${status.replace("_", " ")} estimate v${est.version}${comment ? `: ${comment}` : ""}` } }),
  ]);
  const p = est.project;
  for (const to of await adminRecipients()) {
    await sendEmailChannel({ to, subject: `Estimate ${status.replace("_", " ")}: ${p.reference}`, body: `${p.customerName} ${status} estimate v${est.version} for ${p.reference}.${comment ? `\n${comment}` : ""}\n${appUrl()}/admin/projects/${p.id}` }).catch(() => null);
  }
  return { ok: true as const, status };
}

// ---- what the customer / the pro may see -----------------------------------------------------------------------------------
export const CUSTOMER_EVENT_TYPES = ["created", "status", "visit", "estimate"];

export async function customerProjectView(projectId: string) {
  const p = await prisma.bigProject.findUnique({
    where: { id: projectId },
    include: {
      events: { where: { type: { in: CUSTOMER_EVENT_TYPES } }, orderBy: { createdAt: "desc" }, take: 30 },
      estimates: { where: { status: { not: "superseded" } }, orderBy: { version: "desc" }, take: 1 },
      assignments: { where: { status: { in: ["accepted", "active", "completed"] } } },
      milestones: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!p) return null;
  const pros = await prisma.providerProfile.findMany({ where: { id: { in: p.assignments.map((a) => a.proId) } }, select: { id: true, displayName: true, trades: true, user: { select: { avatarUrl: true } }, isVerified: true } });
  const est = p.estimates[0];
  return {
    id: p.id, reference: p.reference, status: p.status, trades: p.trades, city: p.city, area: p.area, createdAt: p.createdAt, siteVisitAt: p.siteVisitAt,
    contractAmount: p.contractAmount ? Number(p.contractAmount) : null, currency: p.currency, warrantyDays: p.warrantyDays,
    timeline: p.events.map((e) => ({ type: e.type, body: e.type === "status" || e.type === "created" || e.type === "visit" || e.type === "estimate" ? e.body : null, at: e.createdAt })),
    estimate: est ? { id: est.id, version: est.version, status: est.status, total: Number(est.total), subtotal: Number(est.subtotal), discount: Number(est.discount), currency: est.currency, validUntil: est.validUntil, terms: est.terms, items: est.items, link: estimateLink(est.token) } : null,
    team: p.assignments.map((a) => { const pr = pros.find((x) => x.id === a.proId); return { name: (pr?.displayName ?? "Pro").split(" ")[0], trades: pr?.trades ?? [], role: a.role, avatarUrl: pr?.user.avatarUrl ?? null, verified: !!pr?.isVerified }; }),
    milestones: p.milestones.map((m) => ({ id: m.id, title: m.title, status: m.status, dueDate: m.dueDate, readyNote: m.readyNote, photos: m.photos })),
  };
}
