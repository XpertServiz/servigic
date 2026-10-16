import Link from "next/link";
import Image from "next/image";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { MobileNav } from "@/components/dashboard/MobileNav";

// Shared by the admin panel, the pro panel and the customer dashboard.
//  - tablet / desktop (md and up): a compact sidebar that scrolls on its own, content takes the rest of the width
//  - phones (and the Admin app's WebView in portrait): no sidebar, a top bar with a menu button instead, so the
//    content gets the full width and is readable
export function DashboardShell({
  brand,
  navItems,
  userLabel,
  children,
}: {
  brand: string;
  navItems: { href: string; label: string }[];
  userLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <MobileNav brand={brand} navItems={navItems} userLabel={userLabel} />

      <aside className="hidden w-52 flex-none flex-col border-r border-border-subtle bg-bg-elevated p-3 md:sticky md:top-0 md:flex md:h-screen lg:w-56">
        <Link href="/" className="mb-4 flex items-center gap-2 px-1 font-display text-base font-bold">
          <Image src="/logo.png" alt="Servigic" width={28} height={28} className="rounded-[7px]" />
          {brand}
        </Link>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[7px] px-2.5 py-1.5 text-[13px] font-semibold leading-tight text-text-muted hover:bg-bg-elevated-2 hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-3 border-t border-border-subtle pt-3">
          <p className="mb-2 truncate px-1 text-xs text-text-muted">{userLabel}</p>
          <SignOutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 md:overflow-y-auto md:p-8">{children}</main>
    </div>
  );
}
