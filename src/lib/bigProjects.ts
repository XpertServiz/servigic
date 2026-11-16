import { prisma } from "@/lib/prisma";
import { getPrelaunchConfig } from "@/lib/prelaunch";
import { sendEmailChannel } from "@/lib/notify/channels/email";

// Big Projects (whole-house wiring, plumbing...). Shipped dark: nothing shows until FEATURE_BULK_PROJECTS=true.
export const bigProjectsEnabled = () => ["true", "1"].includes((process.env.FEATURE_BULK_PROJECTS ?? "").toLowerCase());

import { PROJECT_TRADES, PROJECT_TYPES, PROPERTY_STAGES, BUDGET_BANDS, START_WINDOWS, label, answerLines } from "@/lib/bigProjectsOptions";
export * from "@/lib/bigProjectsOptions";

export async function nextReference(): Promise<string> {
  const d = new Date();
  const prefix = `SP-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}-`;
  const n = await prisma.bigProject.count({ where: { reference: { startsWith: prefix } } });
  return `${prefix}${String(n + 1).padStart(4, "0")}`;
}

export async function adminRecipients(): Promise<string[]> {
  const raw = (process.env.PROJECTS_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter((s) => s.includes("@"));
  if (raw.length) return raw;
  const cfg = await getPrelaunchConfig();
  return cfg.notifyEmail ? [cfg.notifyEmail] : [];
}

/** In-app + push alert to every admin account (the admin app gets a push), on top of the email. */
export async function notifyAdmins(p: P): Promise<void> {
  const { notify } = await import("@/lib/notify");
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true }, take: 20 });
  for (const a of admins) await notify({ userId: a.id, type: "STATUS_UPDATE", title: `New big project ${p.reference}`, body: `${p.customerName}, ${p.city ?? ""} - ${p.trades.join(", ")}`, linkUrl: `/admin/projects/${p.id}`, push: true }).catch(() => null);
}

const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ENT[c]);
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "https://www.servigic.com").replace(/\/$/, "");

function shell(title: string, inner: string): string {
  return `<div style="background:#0A0808;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f4efe6"><div style="max-width:560px;margin:0 auto;background:#16110f;border:1px solid #2a211c;border-radius:14px;overflow:hidden"><div style="padding:18px 22px;border-bottom:1px solid #2a211c;font-weight:700;color:#F5A623;font-size:18px">Servigic</div><div style="padding:22px"><h2 style="margin:0 0 14px;font-size:19px">${esc(title)}</h2>${inner}</div></div></div>`;
}
const btn = (href: string, text: string) => `<a href="${esc(href)}" style="display:inline-block;margin:6px 8px 6px 0;padding:11px 18px;border-radius:999px;background:#F5A623;color:#1a1208;text-decoration:none;font-weight:700;font-size:14px">${esc(text)}</a>`;
const row = (k: string, v: unknown) => `<tr><td style="padding:5px 12px 5px 0;color:#a89d92;font-size:13px;vertical-align:top">${esc(k)}</td><td style="padding:5px 0;font-size:14px">${esc(v)}</td></tr>`;

const rowHtml = (k: string, html: string) => `<tr><td style="padding:5px 12px 5px 0;color:#a89d92;font-size:13px;vertical-align:top">${esc(k)}</td><td style="padding:5px 0;font-size:14px">${html}</td></tr>`;
const fileLinks = (p: { files: unknown }) => (Array.isArray(p.files) ? (p.files as { url: string; name?: string }[]).map((f, i) => `<a href="${esc(f.url)}" style="color:#F5A623">${esc(f.name || `File ${i + 1}`)}</a>`).join(" &middot; ") : "");

type P = NonNullable<Awaited<ReturnType<typeof prisma.bigProject.findUnique>>>;

function summaryRows(p: P): string {
  return [
    row("Reference", p.reference),
    row("Name", p.customerName),
    row("Phone", p.customerPhone),
    row("Email", p.customerEmail),
    row("Where", [p.area, p.city].filter(Boolean).join(", ")),
    row("Trades", p.trades.map((t) => label(PROJECT_TRADES, t)).join(", ")),
    row("Project", `${label(PROJECT_TYPES, p.projectType)}${p.propertyStage ? ` / ${label(PROPERTY_STAGES, p.propertyStage)}` : ""}`),
    row("Size", p.areaSqft ? `${p.areaSqft} sq ft${p.floors ? `, ${p.floors} floor(s)` : ""}` : "-"),
    row("Budget", label(BUDGET_BANDS, p.budgetBand)),
    row("Start", label(START_WINDOWS, p.startWindow)),
    row("Contact via", `${p.preferredContact ?? "-"} / ${p.bestTime ?? "-"}`),
    ...answerLines(p.answers).map(([k, v]) => row(k, v)),
    row("Notes", p.notes || "-"),
    ...(fileLinks(p) ? [rowHtml("Files", fileLinks(p))] : []),
  ].join("");
}

export async function emailNewProject(p: P): Promise<void> {
  const to = await adminRecipients();
  const wa = `https://wa.me/${p.customerPhone.replace(/\D/g, "")}`;
  const html = shell(`New big project: ${p.reference}`, `<table style="border-collapse:collapse">${summaryRows(p)}</table><p style="margin:16px 0 0">${btn(`tel:${p.customerPhone}`, "Call")}${btn(wa, "WhatsApp")}${btn(`${appUrl()}/admin/projects/${p.id}`, "Open in admin")}</p><p style="color:#a89d92;font-size:12px">Please contact the customer within 2 hours.</p>`);
  const subject = `New big project: ${p.trades.map((t) => label(PROJECT_TRADES, t)).join(", ")} in ${p.city ?? "?"} - ${label(BUDGET_BANDS, p.budgetBand)} - ${p.reference}`;
  for (const addr of to) await sendEmailChannel({ to: addr, subject, body: `${p.reference}\n${p.customerName} ${p.customerPhone}\n${p.city ?? ""} ${p.area ?? ""}\n${p.trades.join(", ")}\n${appUrl()}/admin/projects/${p.id}`, html }).catch((e) => console.error("[projects:email]", e));
}

export async function emailCustomerReceived(p: P): Promise<void> {
  const html = shell("We received your request", `<p style="font-size:15px;line-height:1.5">Thank you, ${esc(p.customerName)}. Your reference is <b>${esc(p.reference)}</b>.</p><ol style="font-size:14px;line-height:1.7;padding-left:20px"><li>A Servigic specialist calls you to understand the job.</li><li>We visit your site - the visit is free.</li><li>You get a clear written amount before any work starts, and verified pros do the work. Any problem within ${p.warrantyDays} days, Servigic comes back and fixes it.</li></ol>`);
  await sendEmailChannel({ to: p.customerEmail, subject: `We received your request ${p.reference}`, body: `Thank you ${p.customerName}. Your reference is ${p.reference}. A Servigic specialist will call you soon.`, html }).catch((e) => console.error("[projects:email]", e));
}

/** One reminder for requests nobody has touched for PROJECTS_SLA_FIRST_CONTACT_MIN (default 120) minutes. Called by the job-health cron. */
export async function sweepProjectSla(): Promise<number> {
  if (!bigProjectsEnabled()) return 0;
  const min = Number(process.env.PROJECTS_SLA_FIRST_CONTACT_MIN) || 120;
  const due = await prisma.bigProject.findMany({ where: { status: "new", slaReminderAt: null, createdAt: { lt: new Date(Date.now() - min * 60_000) } }, take: 20 });
  for (const p of due) {
    const claimed = await prisma.bigProject.updateMany({ where: { id: p.id, slaReminderAt: null }, data: { slaReminderAt: new Date() } });
    if (claimed.count !== 1) continue;
    const html = shell(`Not contacted yet: ${p.reference}`, `<p>This request has been waiting more than ${min} minutes.</p><table>${summaryRows(p)}</table><p>${btn(`${appUrl()}/admin/projects/${p.id}`, "Open in admin")}</p>`);
    for (const addr of await adminRecipients()) await sendEmailChannel({ to: addr, subject: `Not contacted yet: ${p.reference}`, body: `${p.reference} is waiting. ${appUrl()}/admin/projects/${p.id}`, html }).catch(() => null);
    await prisma.bigProjectEvent.create({ data: { projectId: p.id, actor: "system", type: "email", body: "Reminder sent: not contacted yet" } });
  }
  return due.length;
}

/** Pro invitations: remind the pro in the last 3 hours, then mark unanswered ones expired and tell the admin. Called by the job-health cron. */
export async function sweepProjectInvites(): Promise<number> {
  if (!bigProjectsEnabled()) return 0;
  const { notify } = await import("@/lib/notify");
  const now = Date.now();
  const soon = await prisma.bigProjectAssignment.findMany({ where: { status: "invited", respondBy: { gt: new Date(now), lt: new Date(now + 3 * 3600_000) } }, include: { project: { select: { id: true, reference: true } } }, take: 50 });
  let n = 0;
  for (const a of soon) {
    const tag = `Invite reminder ${a.id}`;
    const done = await prisma.bigProjectEvent.findFirst({ where: { projectId: a.projectId, body: tag }, select: { id: true } });
    if (done) continue;
    const pro = await prisma.providerProfile.findUnique({ where: { id: a.proId }, select: { userId: true } });
    if (pro) await notify({ userId: pro.userId, type: "STATUS_UPDATE", title: "Project invitation ending soon", body: `${a.project.reference}: please answer before ${a.respondBy.toLocaleString("en-GB")}`, push: true }).catch(() => null);
    await prisma.bigProjectEvent.create({ data: { projectId: a.projectId, actor: "system", type: "note", body: tag } });
    n++;
  }
  const late = await prisma.bigProjectAssignment.findMany({ where: { status: "invited", respondBy: { lt: new Date(now) } }, include: { project: { select: { id: true, reference: true } } }, take: 50 });
  for (const a of late) {
    const c = await prisma.bigProjectAssignment.updateMany({ where: { id: a.id, status: "invited" }, data: { status: "expired" } });
    if (c.count !== 1) continue;
    await prisma.bigProjectEvent.create({ data: { projectId: a.projectId, actor: "system", type: "note", body: `Invitation expired (no answer): assignment ${a.id}` } });
    for (const addr of await adminRecipients()) await sendEmailChannel({ to: addr, subject: `Pro did not answer: ${a.project.reference}`, body: `An invitation on ${a.project.reference} expired. Invite someone else: ${appUrl()}/admin/projects/${a.project.id}` }).catch(() => null);
    n++;
  }
  return n;
}

/** Email to a pro for a new project: everything the pro needs to decide, but no address, phone or full name (they appear in the app only once Servigic confirms the team). */
export async function emailProInvite(a: { scope: string; role: string; payoutAmount: unknown; plannedStart: Date | null; plannedEnd: Date | null; respondBy: Date }, p: P, to: string, proName: string): Promise<void> {
  const d = (x: Date | null) => (x ? x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-");
  const first = esc(p.customerName.split(" ")[0]);
  const rows = [
    row("Project", p.reference),
    row("Customer", first),
    row("Area", [p.area, p.city].filter(Boolean).join(", ")),
    row("Trades", p.trades.map((t) => label(PROJECT_TRADES, t)).join(", ")),
    row("Type", `${label(PROJECT_TYPES, p.projectType)}${p.propertyStage ? ` / ${label(PROPERTY_STAGES, p.propertyStage)}` : ""}`),
    row("Size", p.areaSqft ? `${p.areaSqft} sq ft${p.floors ? `, ${p.floors} floor(s)` : ""}` : "-"),
    row("Start", label(START_WINDOWS, p.startWindow)),
    ...answerLines(p.answers).map(([k, v]) => row(k, v)),
    row("Notes", p.notes || "-"),
  ].join("");
  const html = shell("New project for you", `<p style="font-size:15px;line-height:1.5;margin:0 0 14px">Hello ${esc(proName)}, Servigic invites you to work on a project.</p>
<div style="background:#1f1814;border:1px solid #2a211c;border-radius:12px;padding:14px 16px;margin-bottom:14px"><div style="color:#a89d92;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Your work (${esc(a.role)})</div><div style="font-size:16px;font-weight:700;margin:4px 0 10px">${esc(a.scope)}</div><div style="color:#a89d92;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Your payout</div><div style="font-size:22px;font-weight:800;color:#F5A623">${esc(p.currency)} ${Number(a.payoutAmount).toLocaleString("en-US")}</div><div style="font-size:13px;color:#a89d92;margin-top:8px">Planned: ${d(a.plannedStart)} to ${d(a.plannedEnd)}</div></div>
<table style="border-collapse:collapse;width:100%">${rows}</table>
<p style="margin:16px 0 4px">${btn(`${appUrl()}/projects`, "Open the Servigic Pro app")}</p>
<p style="font-size:13px;color:#f5c26b;margin:8px 0">Please answer before ${esc(a.respondBy.toLocaleString("en-GB"))}.</p>
<p style="color:#a89d92;font-size:12px;line-height:1.5">The address and the customer's contact are shared in the app after you accept and Servigic confirms the team. All communication and payment stay with Servigic.</p>`);
  await sendEmailChannel({ to, subject: `New project for you: ${p.trades.map((t) => label(PROJECT_TRADES, t)).join(", ")} in ${p.city ?? "your city"} - ${p.reference}`, body: `New project ${p.reference} in ${p.city ?? ""}: ${a.scope}. Payout ${p.currency} ${Number(a.payoutAmount).toLocaleString("en-US")}. Open the Servigic Pro app to accept before ${a.respondBy.toLocaleString("en-GB")}.`, html }).catch((e) => console.error("[projects:email]", e));
}

/** Asks the customer to rate a completed project; the private estimate link also carries the rating form. */
export async function emailRateRequest(projectId: string): Promise<void> {
  const p = await prisma.bigProject.findUnique({ where: { id: projectId }, include: { estimates: { orderBy: { version: "desc" }, take: 1, select: { token: true } } } });
  const token = p?.estimates[0]?.token;
  if (!p || !token) return;
  const link = `${appUrl()}/e/${token}`;
  const html = shell("How did we do?", `<p style="font-size:15px;line-height:1.5">Hello ${esc(p.customerName)}, your project <b>${esc(p.reference)}</b> is complete. Please rate it - it takes 10 seconds and helps us improve.</p><p>${btn(link, "Rate your project")}</p><p style="color:#a89d92;font-size:12px">Any problem within ${p.warrantyDays} days, Servigic comes back and fixes it.</p>`);
  await sendEmailChannel({ to: p.customerEmail, subject: `Your project ${p.reference} is complete - please rate it`, body: `Your project ${p.reference} is complete. Rate it here: ${link}`, html }).catch(() => null);
}
