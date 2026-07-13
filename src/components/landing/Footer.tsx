import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/request";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { detectMarket } from "@/lib/geoDetect";
import { LegalDisclaimer } from "@/components/ui/LegalDisclaimer";

export async function Footer() {
  const [locale, market] = await Promise.all([getLocale() as Promise<Locale>, detectMarket()]);
  return (
    <footer className="mt-16 border-t border-border-subtle py-16">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-5">
          <div>
            <Link href="/" className="mb-3 flex items-center gap-2.5 font-display text-xl font-bold">
              <Image src="/logo.png" alt="Servigic" width={34} height={34} className="rounded-[9px]" />
              Servigic
            </Link>
            <p className="max-w-[260px] text-[13px] text-text-dim text-text-muted">
              The Uber of home services. Post a job. Pros race to bid. Fixed today.
            </p>
          </div>
          <div>
            <h5 className="mb-4 text-xs uppercase tracking-wide text-text-dim text-text-muted">Services</h5>
            <ul className="flex flex-col gap-2.5 text-sm text-text-muted">
              <li><Link href="/services/plumber/karachi">Plumber — Karachi</Link></li>
              <li><Link href="/services/electrician/karachi">Electrician — Karachi</Link></li>
              <li><Link href="/services/ac-technician/karachi">AC Technician — Karachi</Link></li>
              <li><Link href="/services/carpenter/lahore">Carpenter — Lahore</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="mb-4 text-xs uppercase tracking-wide text-text-dim text-text-muted">Company</h5>
            <ul className="flex flex-col gap-2.5 text-sm text-text-muted">
              <li><Link href="/how-it-works">How It Works</Link></li>
              <li><Link href="/trust-and-safety">Trust &amp; Safety</Link></li>
              <li><a href="#faq">FAQ</a></li>
              <li><Link href="/business">Managing multiple properties?</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="mb-4 text-xs uppercase tracking-wide text-text-dim text-text-muted">For Pros</h5>
            <ul className="flex flex-col gap-2.5 text-sm text-text-muted">
              <li><Link href="/pro">Become a Pro</Link></li>
              <li><Link href="/pro#earnings">Earnings Calculator</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="mb-4 text-xs uppercase tracking-wide text-text-dim text-text-muted">Legal</h5>
            <ul className="flex flex-col gap-2.5 text-sm text-text-muted">
              <li><Link href="/legal/terms">Terms</Link></li>
              <li><Link href="/legal/privacy">Privacy</Link></li>
            </ul>
          </div>
        </div>
        {market.legalDisclaimer && (
          <div className="border-t border-border-subtle pt-6">
            <LegalDisclaimer text={market.legalDisclaimer} className="max-w-3xl" />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-6 text-[13px] text-text-dim text-text-muted">
          <span>© 2026 Servigic. All rights reserved.</span>
          <div className="flex items-center gap-3">
            <CurrencySwitcher current={market.country} />
            <LanguageSwitcher current={locale} />
          </div>
        </div>
      </div>
    </footer>
  );
}
