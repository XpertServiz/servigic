import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export function InfoPageShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-[800px] px-6 py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">{eyebrow}</p>
          <h1 className="mb-10 font-display text-4xl font-bold uppercase leading-tight md:text-5xl">{title}</h1>
          <div className="flex flex-col gap-8 text-text-muted [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-text [&_h2]:uppercase [&_p]:leading-relaxed">
            {children}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
