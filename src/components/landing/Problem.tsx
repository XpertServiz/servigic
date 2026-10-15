import { getLocale, getTranslations } from "next-intl/server";
import { getDemoMoney } from "@/lib/money";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";

export async function Problem() {
  const [t, locale] = await Promise.all([getTranslations("problem"), getLocale()]);
  const demo = await getDemoMoney(locale);
  // The anecdote quotes a quoted vs. demanded price; show it in the visitor's own currency.
  const items = (t.raw("items") as string[]).map((s) => s.replace("{a}", demo.price(1500)).replace("{b}", demo.price(4000).replace(/^PKR\s*/, "")));

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
