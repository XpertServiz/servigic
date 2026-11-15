import { prisma } from "@/lib/prisma";
import { getPrelaunchConfig } from "@/lib/prelaunch";
import { sendEmailChannel } from "@/lib/notify/channels/email";

// Big Projects (whole-house wiring, plumbing...). Shipped dark: nothing shows until FEATURE_BULK_PROJECTS=true.
export const bigProjectsEnabled = () => ["true", "1"].includes((process.env.FEATURE_BULK_PROJECTS ?? "").toLowerCase());

import { PROJECT_TRADES, PROJECT_TYPES, PROPERTY_STAGES, BUDGET_BANDS, START_WINDOWS, label } from "@/lib/bigProjectsOptions";
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

const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ENT[c]);
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "https://www.servigic.com").replace(/\/$/, "");

function shell(title: string, inner: string): string {
  return `<div style="background:#0A0808;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f4efe6"><div style="max-width:560px;margin:0 auto;background:#16110f;border:1px solid #2a211c;border-radius:14px;overflow:hidden"><div style="padding:18px 22px;border-bottom:1px solid #2a211c;font-weight:700;color:#F5A623;font-size:18px">Servigic</div><div style="padding:22px"><h2 style="margin:0 0 14px;font-size:19px">${esc(title)}</h2>${inner}</div></div></div>`;
}
const btn = (href: string, text: string) => `<a href="${esc(href)}" style="display:inline-block;margin:6px 8px 6px 0;padding:11px 18px;border-radius:999px;background:#F5A623;color:#1a1208;text-decoration:none;font-weight:700;font-size:14px">${esc(text)}</a>`;
const row = (k: string, v: unknown) => `<tr><td style="padding:5px 12px 5px 0;color:#a89d92;font-size:13px;vertical-align:top">${esc(k)}</td><td style="padding:5px 0;font-size:14px">${esc(v)}</td></tr>`;

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
    row("Notes", p.notes || "-"),
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
