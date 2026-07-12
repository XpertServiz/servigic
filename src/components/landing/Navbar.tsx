import Link from "next/link";
import { Button } from "@/components/ui/Button";

const LINKS = [
  { href: "#how", label: "How It Works" },
  { href: "#services", label: "Services" },
  { href: "#pros", label: "For Pros" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-[#ff8a20] font-extrabold text-accent-foreground">
            S
          </span>
          Servigic
        </Link>
        <div className="hidden items-center gap-8 text-sm font-semibold text-text-muted md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-text">
              {l.label}
            </a>
          ))}
          <Link href="/login" className="hover:text-text">
            Login
          </Link>
        </div>
        <Button href="/signup?role=customer" size="md">
          Post a Job →
        </Button>
      </nav>
    </header>
  );
}
