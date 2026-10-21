import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { TxCurrencyProvider } from "@/components/i18n/TxCurrency";
import { getTxCurrency } from "@/lib/txCurrency";

const NAV = [
  { href: "/dashboard", label: "My Jobs" },
  { href: "/jobs/new", label: "Post a Job" },
  { href: "/bookings", label: "Bookings" },
  { href: "/dashboard/plans", label: "Maintenance Plans" },
];

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [session, currency] = await Promise.all([auth(), getTxCurrency()]);
  return (
    <DashboardShell brand="Servigic" navItems={NAV} userLabel={session?.user?.name ?? ""}>
      <TxCurrencyProvider code={currency}>{children}</TxCurrencyProvider>
    </DashboardShell>
  );
}
