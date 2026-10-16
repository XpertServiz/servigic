"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

/** Phone layout of the dashboard navigation: a slim top bar; the menu opens as a compact list over the content. */
export function MobileNav({ brand, navItems, userLabel }: { brand: string; navItems: { href: string; label: string }[]; userLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // close the menu whenever the page changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // the page behind a open menu should not scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = navItems.filter((n) => n.href === "/" || pathname === n.href || pathname.startsWith(`${n.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="md:hidden">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border-subtle bg-bg-elevated px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-[8px] border border-border-subtle text-lg leading-none"
        >
          {open ? "✕" : "☰"}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-bold leading-tight">{brand}</div>
          <div className="truncate text-[11px] leading-tight text-text-muted">{active?.label ?? ""}</div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[57px] z-20 flex flex-col bg-bg-elevated">
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {navItems.map((item) => {
              const isActive = active?.href === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block border-b border-border-subtle/60 px-3 py-2.5 text-[14px] font-semibold ${isActive ? "bg-accent/10 text-accent" : "text-text-muted"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border-subtle p-3">
            <p className="mb-2 truncate text-xs text-text-muted">{userLabel}</p>
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}
