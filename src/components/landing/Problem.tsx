import { getTranslations } from "next-intl/server";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";

export async function Problem() {
  const t = await getTranslations("problem");
  const items = t.raw("items") as string[];

  return (
    <section className="container-x py-16 md:py-24">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} />
      <div className="border-t border-white/[0.07]">
        {items.map((p, i) => (
          <Reveal key={p} delay={i * 60}>
            <div className="flex items-center gap-4 border-b border-white/[0.07] py-5 text-base text-text-muted md:text-lg">
              <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-danger/10 text-[14px] font-extrabold text-danger" aria-hidden>
                ✕
              </span>
              {p}
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal>
        <p className="mt-8 text-lg font-bold text-accent md:text-xl">{t("fix")}</p>
      </Reveal>
    </section>
  );
}
