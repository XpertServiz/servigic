import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/durations", label: "Job Durations" },
  { href: "/admin/exchange-rates", label: "Exchange Rates" },
  { href: "/admin/locales", label: "Countries & Localization" },
  { href: "/admin/price-benchmarks", label: "Price Benchmarks" },
  { href: "/admin/maintenance-plans", label: "Maintenance Plans" },
  { href: "/admin/business-waitlist", label: "Business Waitlist" },
  { href: "/admin/accounting/chart-of-accounts", label: "Chart of Accounts" },
  { href: "/admin/accounting/journal", label: "General Journal" },
  { href: "/admin/accounting/ledger", label: "General Ledger" },
  { href: "/admin/accounting/reports", label: "Financial Reports" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <DashboardShell brand="Servigic Admin" navItems={NAV} userLabel={session?.user?.name ?? ""}>
      {children}
    </DashboardShell>
  );
}
