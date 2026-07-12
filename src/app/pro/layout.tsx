import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const NAV = [
  { href: "/pro/dashboard", label: "Dashboard" },
  { href: "/pro/jobs", label: "Job Feed" },
  { href: "/pro/bookings", label: "Bookings" },
  { href: "/pro/earnings", label: "Earnings" },
  { href: "/pro/profile", label: "Profile" },
];

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <DashboardShell brand="Servigic Pro" navItems={NAV} userLabel={session?.user?.name ?? ""}>
      {children}
    </DashboardShell>
  );
}
