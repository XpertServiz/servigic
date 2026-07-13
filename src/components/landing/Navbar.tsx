import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";

export async function Navbar() {
  const t = await getTranslations("nav");
  const LINKS = [
    { href: "#how", label: t("howItWorks") },
    { href: "#services", label: t("services") },
    { href: "#pros", label: t("forPros") },
    { href: "#faq", label: t("faq") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold">
          <Image src="/logo.png" alt="Servigic" width={34} height={34} className="rounded-[9px]" priority />
          Servigic
        </Link>
        <div className="hidden items-center gap-8 text-sm font-semibold text-text-muted md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-text">
              {l.label}
            </a>
          ))}
          <Link href="/login" className="hover:text-text">
            {t("login")}
          </Link>
        </div>
        <Button href="/signup?role=customer" size="md">
          {t("postJob")} →
        </Button>
      </nav>
    </header>
  );
}
