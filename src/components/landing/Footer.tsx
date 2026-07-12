import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border-subtle py-16">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-5">
          <div>
            <Link href="/" className="mb-3 flex items-center gap-2.5 font-display text-xl font-bold">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-[#ff8a20] font-extrabold text-accent-foreground">
                S
              </span>
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
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-6 text-[13px] text-text-dim text-text-muted">
          <span>© 2026 Servigic. All rights reserved.</span>
          <div className="flex gap-2">
            <span className="rounded-md border border-border-subtle px-2.5 py-1">EN</span>
            <span className="rounded-md border border-border-subtle px-2.5 py-1">اردو</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
