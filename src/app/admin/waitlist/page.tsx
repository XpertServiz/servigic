import { prisma } from "@/lib/prisma";
import { getPrelaunchConfig } from "@/lib/prelaunch";
import { foundingSlotsLeft } from "@/lib/foundingPro";
import { FORM_COUNTRIES, TRADE_LABELS, WAITLIST_TRADES } from "@/lib/prelaunchData";
import { waitlistWhere } from "@/lib/waitlistQuery";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

const field = "rounded-[10px] border border-border-subtle bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent";

export default async function AdminWaitlistPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const where = waitlistWhere(sp);
  const [rows, total, byCountry, byRole, cfg, founding] = await Promise.all([
    prisma.waitlistSignup.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.waitlistSignup.count({ where }),
    prisma.waitlistSignup.groupBy({ by: ["countryCode"], where, _count: { _all: true }, orderBy: { _count: { countryCode: "desc" } } }),
    prisma.waitlistSignup.groupBy({ by: ["role"], where, _count: { _all: true } }),
    getPrelaunchConfig(),
    foundingSlotsLeft(),
  ]);
  const roleCount = (r: string) => byRole.find((x) => x.role === r)?._count._all ?? 0;
  const countryName = (c: string) => FORM_COUNTRIES.find((x) => x.code === c)?.name ?? c;

  const query = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  const exportAll = `/api/admin/waitlist/export?${query.toString()}`;
  const exportLaunch = `/api/admin/waitlist/export?${new URLSearchParams({ ...Object.fromEntries(query), mode: "launch" }).toString()}`;
  const anyLive = cfg.proAppLive || cfg.customerAppLive;

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Early list</h1>
      <p className="mb-6 max-w-3xl text-text-muted">
        People who joined from the website. A message is emailed to <b>{cfg.notifyEmail || "(set an email in Settings)"}</b> on every signup. The same WhatsApp number joining again updates its row.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Total (with filters)", total],
          ["Customers", roleCount("CUSTOMER")],
          ["Pros", roleCount("PROVIDER")],
          [`Founding Pro places left (${founding.rule.city})`, `${founding.left} of ${founding.rule.slots}`],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-4">
            <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-xs text-text-muted">
          <span className="mb-1 block">Role</span>
          <select name="role" defaultValue={sp.role ?? ""} className={field}>
            <option value="">All</option>
            <option value="CUSTOMER">Customers</option>
            <option value="PROVIDER">Pros</option>
          </select>
        </label>
        <label className="text-xs text-text-muted">
          <span className="mb-1 block">Country</span>
          <select name="country" defaultValue={sp.country ?? ""} className={field}>
            <option value="">All</option>
            {FORM_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-muted">
          <span className="mb-1 block">City</span>
          <input name="city" defaultValue={sp.city ?? ""} className={`${field} w-36`} />
        </label>
        <label className="text-xs text-text-muted">
          <span className="mb-1 block">Trade</span>
          <select name="trade" defaultValue={sp.trade ?? ""} className={field}>
            <option value="">All</option>
            {WAITLIST_TRADES.map((t) => (
              <option key={t} value={t}>{TRADE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-muted">
          <span className="mb-1 block">From</span>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className={field} />
        </label>
        <label className="text-xs text-text-muted">
          <span className="mb-1 block">To</span>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className={field} />
        </label>
        <button type="submit" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground">Filter</button>
        <a href="/admin/waitlist" className="px-2 py-2 text-sm text-text-muted hover:text-text">Clear</a>
      </form>

      <div className="mb-6 flex flex-wrap gap-3">
        <a href={exportAll} className="rounded-full border border-accent/50 px-5 py-2 text-sm font-semibold text-accent hover:bg-accent/10">Export CSV</a>
        {anyLive && (
          <a href={exportLaunch} className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-secondary-foreground">
            Send launch message (CSV of WhatsApp numbers + emails)
          </a>
        )}
      </div>

      {byCountry.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {byCountry.map((c) => (
            <a
              key={c.countryCode}
              href={`/admin/waitlist?${new URLSearchParams({ ...Object.fromEntries(query), country: c.countryCode }).toString()}`}
              className="rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-xs text-text-muted hover:border-accent/60"
            >
              {countryName(c.countryCode)}: <b className="text-text">{c._count._all}</b>
            </a>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-3">Joined</th>
              <th className="p-3">Role</th>
              <th className="p-3">Name</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Country</th>
              <th className="p-3">City / area</th>
              <th className="p-3">Email</th>
              <th className="p-3">Trade / exp.</th>
              <th className="p-3">Gmail</th>
              <th className="p-3">Lang</th>
              <th className="p-3">Referred by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border-subtle align-top">
                <td className="p-3 whitespace-nowrap text-text-muted">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="p-3">{r.role === "PROVIDER" ? "Pro" : "Customer"}</td>
                <td className="p-3 font-semibold">{r.name}</td>
                <td className="p-3 whitespace-nowrap" dir="ltr">{r.whatsapp}</td>
                <td className="p-3 text-text-muted">{r.countryCode}{r.detectedCountry && r.detectedCountry !== r.countryCode ? ` (${r.detectedCountry})` : ""}</td>
                <td className="p-3 text-text-muted">{[r.city, r.area].filter(Boolean).join(" / ") || "—"}</td>
                <td className="p-3 text-text-muted" dir="ltr">{r.email ?? "—"}</td>
                <td className="p-3 text-text-muted">{r.trade ? `${TRADE_LABELS[r.trade as keyof typeof TRADE_LABELS] ?? r.trade}${r.experienceYears != null ? ` · ${r.experienceYears}y` : ""}` : "—"}</td>
                <td className="p-3 text-text-muted" dir="ltr">{r.gmail ?? "—"}</td>
                <td className="p-3 text-text-muted">{r.language}</td>
                <td className="p-3 font-mono text-xs text-text-muted">{r.referredByCode ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="p-6 text-center text-text-muted">No signups match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > rows.length && <p className="mt-3 text-xs text-text-muted">Showing the newest {rows.length} of {total}. Export CSV has all of them.</p>}
    </div>
  );
}
