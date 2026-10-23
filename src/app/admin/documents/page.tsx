import { prisma } from "@/lib/prisma";
import { docSettings } from "@/lib/proDocuments";
import { DocumentReview, DocumentSettingsForm } from "./DocumentsClient";

// Pro documents: new and replacement documents waiting for approval (target 24-48 hours), documents expiring soon or
// expired, and the reminder / grace-period / mandatory-type rules.
const DAY = 24 * 60 * 60 * 1000;

// Data and "now" are read outside the component body (rendering itself must stay pure).
async function load() {
  const now = Date.now();
  const settings = await docSettings();
  const [pending, expiring] = await Promise.all([
    prisma.providerDocument.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
      include: { provider: { select: { displayName: true, serialNumber: true, documentsBlockedAt: true, user: { select: { name: true, phone: true, city: true } } } } },
      take: 100,
    }),
    prisma.providerDocument.findMany({
      where: { status: "APPROVED", expiresAt: { not: null, lte: new Date(now + (settings.alertDays[0] ?? 30) * DAY) } },
      orderBy: { expiresAt: "asc" },
      include: { provider: { select: { displayName: true, documentsBlockedAt: true, user: { select: { name: true, phone: true } } } } },
      take: 200,
    }),
  ]);
  return { now, settings, pending, expiring };
}

export default async function AdminDocumentsPage() {
  const { now, settings, pending, expiring } = await load();
  const waitingHours = (d: Date) => Math.round((now - d.getTime()) / 3_600_000);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Pro documents</h1>
      <p className="mb-8 max-w-3xl text-text-muted">
        New and replacement IDs, certificates, licences and insurance from pros. Approve within 24-48 hours: the new document replaces the old one. Rejecting asks the pro for a corrected copy with
        your reason.
      </p>

      <h2 className="mb-3 text-lg font-bold">Waiting for approval ({pending.length})</h2>
      {pending.length === 0 && <p className="mb-8 text-sm text-text-muted">Nothing waiting.</p>}
      <div className="mb-10 flex flex-col gap-3">
        {pending.map((d) => (
          <div key={d.id} className="flex flex-wrap items-start gap-4 rounded-[14px] border border-border-subtle bg-bg-elevated p-4">
            <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="block h-24 w-32 flex-none overflow-hidden rounded-[10px] border border-border-subtle bg-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.fileUrl} alt={d.label} className="h-full w-full object-cover" />
            </a>
            <div className="min-w-[220px] flex-1 text-sm">
              <div className="font-bold">
                {d.label} <span className="ms-1 rounded-full border border-border-subtle px-2 py-0.5 text-xs text-text-muted">{d.type}</span>
              </div>
              <div className="text-text-muted">
                {d.provider.displayName || d.provider.user.name} · Pro #{d.provider.serialNumber} · {d.provider.user.city ?? "—"}
              </div>
              <div className="text-text-muted">
                Expires: {d.expiresAt ? d.expiresAt.toISOString().slice(0, 10) : "no expiry"} · waiting {waitingHours(d.submittedAt)} h{waitingHours(d.submittedAt) > 48 ? " ⚠️ over 48 h" : ""}
              </div>
              {d.provider.documentsBlockedAt && <div className="mt-1 text-xs font-semibold text-danger">Job access paused until a valid document is approved</div>}
            </div>
            <DocumentReview id={d.id} />
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-bold">Expiring soon or expired ({expiring.length})</h2>
      <div className="mb-10 overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-3">Pro</th>
              <th className="p-3">Document</th>
              <th className="p-3">Expires</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {expiring.map((d) => {
              const days = Math.ceil((d.expiresAt!.getTime() - now) / DAY);
              return (
                <tr key={d.id} className="border-t border-border-subtle">
                  <td className="p-3">{d.provider.displayName || d.provider.user.name}</td>
                  <td className="p-3">{d.label}</td>
                  <td className="p-3">{d.expiresAt!.toISOString().slice(0, 10)}</td>
                  <td className={`p-3 font-semibold ${days < 0 ? "text-danger" : "text-accent"}`}>
                    {days < 0 ? `Expired ${-days} days ago` : `In ${days} days`}
                    {d.provider.documentsBlockedAt ? " · access paused" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-bold">Rules</h2>
      <DocumentSettingsForm alertDays={settings.alertDays} graceDays={settings.graceDays} mandatory={settings.mandatory} />
    </div>
  );
}
