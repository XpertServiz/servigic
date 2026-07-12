import { prisma } from "@/lib/prisma";
import { LocalesClient } from "./LocalesClient";

export default async function AdminLocalesPage() {
  const [configs, waitlistEntries] = await Promise.all([
    prisma.localeConfig.findMany({ orderBy: { countryCode: "asc" } }),
    prisma.countryWaitlistEntry.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Countries &amp; Localization</h1>
      <p className="mb-8 text-text-muted">
        Language, currency, payment methods shown, legal disclaimer text, and go-live status per country — editable
        here without a redeploy. Only countries with <b>Live</b> toggled on show the full app; others show a
        waitlist landing page.
      </p>
      <LocalesClient
        configs={configs.map((c) => ({
          countryCode: c.countryCode,
          countryName: c.countryName,
          language: c.language,
          direction: c.direction,
          currency: c.currency,
          paymentMethodsShown: c.paymentMethodsShown,
          legalDisclaimer: c.legalDisclaimer,
          isLive: c.isLive,
          citiesLive: c.citiesLive,
        }))}
      />

      {waitlistEntries.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl font-bold uppercase">Country Waitlist Signups</h2>
          <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="p-4">Country</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {waitlistEntries.map((w) => (
                  <tr key={w.id} className="border-t border-border-subtle">
                    <td className="p-4 font-semibold">{w.countryCode}</td>
                    <td className="p-4 text-text-muted">{w.email}</td>
                    <td className="p-4 text-text-muted">{w.name ?? "—"}</td>
                    <td className="p-4 text-text-muted">{w.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
