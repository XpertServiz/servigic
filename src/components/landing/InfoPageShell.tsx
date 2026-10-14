import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Eyebrow } from "@/components/landing/Eyebrow";

export function InfoPageShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <section className="container-x relative max-w-[860px] py-14 md:py-20">
          <div className="sv-glow pointer-events-none absolute -top-20 start-[-10%] -z-10 h-72 w-72 opacity-40" aria-hidden />
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mb-10 text-[clamp(30px,5.2vw,52px)] font-extrabold leading-[1.08] tracking-[-0.018em]">{title}</h1>
          <div className="flex flex-col gap-5 text-text-muted [&_p]:leading-relaxed">{children}</div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/** One numbered/titled block on an info page. */
export function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sv-card p-6 md:p-7">
      <h2 className="mb-2 text-lg font-bold text-text md:text-xl">{title}</h2>
      <p className="text-[15px] leading-relaxed">{children}</p>
    </div>
  );
}
