import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { LLink } from "@/components/i18n/LLink";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import type { Locale } from "@/i18n/locales";

export async function Navbar() {
  const [t, locale] = await Promise.all([getTranslations("nav"), getLocale() as Promise<Locale>]);
  const links = [
    { href: "/how-it-works", label: t("howItWorks") },
    { href: "/services", label: t("services") },
    { href: "/pro", label: t("forPros") },
    { href: "/trust-and-safety", label: t("trust") },
  ];

  // The glass effect lives on a pseudo-element: backdrop-filter on the header itself
  // would make it the containing block of the fixed mobile menu.
  return (
    <header className="sticky top-[var(--sv-top-offset,0px)] z-50 border-b border-white/[0.06] before:absolute before:inset-0 before:-z-10 before:bg-bg/70 before:backdrop-blur-xl">
      <nav className="container-x flex items-center justify-between gap-4 py-3" aria-label="Main">
        <LLink href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-[-0.018em]" aria-label="Servigic">
          <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="rounded-[10px]" priority />
          Servigic
        </LLink>

        <div className="hidden items-center gap-1 text-sm font-medium text-text-muted lg:flex">
          {links.map((l) => (
            <LLink key={l.href} href={l.href} className="rounded-full px-4 py-2 transition-colors hover:bg-white/[0.05] hover:text-text">
              {l.label}
            </LLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher current={locale} />
          <LLink href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text">
            {t("login")}
          </LLink>
          <Button href="/signup?role=customer" size="md">
            {t("postJob")}
            <span aria-hidden className="rtl:rotate-180">→</span>
          </Button>
        </div>

        <MobileMenu
          current={locale}
          links={[...links, { href: "/login", label: t("login") }]}
          cta={{ href: "/signup?role=customer", label: t("postJob") }}
          labels={{ open: t("menu"), close: t("close") }}
        />
      </nav>
    </header>
  );
}
