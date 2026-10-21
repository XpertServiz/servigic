import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { TxCurrencyProvider } from "@/components/i18n/TxCurrency";
import { getTxCurrency } from "@/lib/txCurrency";

const NAV = [
  { href: "/pro/dashboard", label: "Dashboard" },
  { href: "/pro/jobs", label: "Job Feed" },
  { href: "/pro/bookings", label: "Bookings" },
  { href: "/pro/earnings", label: "Earnings" },
  { href: "/pro/plans", label: "Recurring Customers" },
  { href: "/pro/profile", label: "Profile" },
];

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const [session, currency] = await Promise.all([auth(), getTxCurrency()]);
  // A pro can sign in right after sign-up, before the admin has approved the documents. Every page of the panel then
  // carries the same reassurance, in the visitor's language, so nobody wonders why nothing is happening.
  const profile = session?.user?.id ? await prisma.providerProfile.findUnique({ where: { userId: session.user.id }, select: { isVerified: true, verificationLevel: true } }).catch(() => null) : null;
  const pending = Boolean(profile && !profile.isVerified && profile.verificationLevel < 1);
  const t = pending ? await getTranslations("auth") : null;
  return (
    <DashboardShell brand="Servigic Pro" navItems={NAV} userLabel={session?.user?.name ?? ""}>
      {pending && t && (
        <div role="note" className="mb-6 rounded-2xl border border-accent/40 bg-accent/10 p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-accent">
            <span aria-hidden>⏳</span> {t("proPendingTitle")}
          </div>
          <p className="text-[13px] leading-relaxed text-text-muted">{t("proPendingBody")}</p>
        </div>
      )}
      <TxCurrencyProvider code={currency}>{children}</TxCurrencyProvider>
    </DashboardShell>
  );
}
