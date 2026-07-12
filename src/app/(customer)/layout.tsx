import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const NAV = [
  { href: "/dashboard", label: "My Jobs" },
  { href: "/jobs/new", label: "Post a Job" },
  { href: "/bookings", label: "Bookings" },
];

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <DashboardShell brand="Servigic" navItems={NAV} userLabel={session?.user?.name ?? ""}>
      {children}
    </DashboardShell>
  );
}
