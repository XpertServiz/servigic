import Link from "next/link";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

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
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-60 flex-none flex-col border-r border-border-subtle bg-bg-elevated p-5">
        <Link href="/" className="mb-8 flex items-center gap-2.5 font-display text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-accent to-[#ff8a20] font-extrabold text-accent-foreground">
            S
          </span>
          {brand}
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[8px] px-3 py-2.5 text-sm font-semibold text-text-muted hover:bg-bg-elevated-2 hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-border-subtle pt-4">
          <p className="mb-3 truncate text-xs text-text-muted">{userLabel}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
