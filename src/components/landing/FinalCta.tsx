import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { LogoMark3D } from "@/components/brand/LogoMark3D";
import { AppDownloadButton } from "@/components/prelaunch/AppDownloadButton";

export async function FinalCta() {
  const t = await getTranslations("finalCta");
  const checks = t.raw("checks") as string[];

  return (
    <section id="post" className="container-x py-12 md:py-16">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[28px] border border-accent/30 bg-bg-elevated px-6 py-16 text-center md:py-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(255,176,32,.22),transparent_70%)]" aria-hidden />
          <div className="sv-grid-bg absolute inset-0 -z-10 opacity-60" aria-hidden />
          <div className="mb-2 flex justify-center">
            <LogoMark3D size={72} />
          </div>
          <h2 className="text-[clamp(34px,6.4vw,68px)] font-extrabold leading-[1.04] tracking-[-0.018em]">
            {t("title1")}
            <br />
            <span className="text-gradient">{t("title2")}</span>
          </h2>
          <p className="mx-auto my-5 max-w-lg text-base text-text-muted md:text-lg">{t("sub")}</p>
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            <Button href="/signup?role=customer" size="lg">
              {t("primary")} <span aria-hidden className="rtl:rotate-180">→</span>
            </Button>
            <Button href="/pro" variant="ghost" size="lg">
              {t("secondary")}
            </Button>
            <AppDownloadButton app="customer" variant="ghost" />
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-text-muted">
            {checks.map((c) => (
              <span key={c}>
                <span className="me-1 text-secondary">✓</span>
                {c}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
