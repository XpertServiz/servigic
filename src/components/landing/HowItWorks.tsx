import { getTranslations } from "next-intl/server";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";
import { TiltCard } from "@/components/ui/TiltCard";

interface Step {
  title: string;
  desc: string;
  mock: string;
}

export async function HowItWorks() {
  const t = await getTranslations("how");
  const steps = t.raw("steps") as Step[];

  return (
    <section id="how" className="container-x py-16 md:py-24">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 90}>
            <TiltCard className="h-full p-7 md:p-8">
              <div className="mb-3 bg-gradient-to-b from-accent/70 to-accent/5 bg-clip-text font-mono text-[56px] font-bold leading-none text-transparent">0{i + 1}</div>
              <h3 className="mb-2.5 text-xl font-bold">{s.title}</h3>
              <p className="mb-5 text-[15px] text-text-muted">{s.desc}</p>
              <div className="rounded-xl border border-border-subtle bg-bg-elevated-2 p-3.5 text-xs text-text-muted">{s.mock}</div>
            </TiltCard>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-5">
        <div className="relative overflow-hidden rounded-[20px] border border-accent/40 bg-gradient-to-br from-accent/[0.10] to-bg-elevated p-7 md:p-9">
          <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-accent">{t("emergencyLabel")}</p>
          <h3 className="mb-2.5 text-xl font-bold md:text-2xl">{t("emergencyTitle")}</h3>
          <p className="mb-5 max-w-2xl text-[15px] text-text-muted">{t("emergencyDesc")}</p>
          <div className="rounded-xl border border-accent/30 bg-bg-elevated-2 p-3.5 text-xs text-text-muted">{t("emergencyMock")}</div>
        </div>
      </Reveal>
    </section>
  );
}
