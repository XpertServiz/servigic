import { getLocale, getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { fmtPKR } from "@/lib/format";

function Block({ eyebrow, tone, title, children, visual, flip }: { eyebrow: string; tone?: "accent" | "secondary"; title: string; children: React.ReactNode; visual: React.ReactNode; flip?: boolean }) {
  return (
    <div className="grid grid-cols-1 items-center gap-8 border-t border-white/[0.07] py-12 md:grid-cols-2 md:gap-16 md:py-20">
      <Reveal className={flip ? "md:order-2" : ""}>
        <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
        <h3 className="mb-4 text-[clamp(24px,3.2vw,36px)] font-bold leading-tight tracking-tight">{title}</h3>
        <div className="flex flex-col gap-2 text-text-muted">{children}</div>
      </Reveal>
      <Reveal delay={120} className={flip ? "md:order-1" : ""}>
        <div className="sv-card min-h-[260px] p-5 md:p-6">{visual}</div>
      </Reveal>
    </div>
  );
}

const chip = "rounded-full border border-border-subtle px-2.5 py-1 text-[10.5px] text-text-muted";

export async function Features({ paymentMode }: { paymentMode: "CASH_WALLET" | "PROTECTED" }) {
  const [t, locale] = await Promise.all([getTranslations("features"), getLocale()]);
  const cash = paymentMode === "CASH_WALLET";
  const payKey = cash ? "cash" : "protected";
  const paySteps = t.raw(`${payKey}.steps`) as string[];
  const payIcons = cash ? ["⚖️", "✓", "💵"] : ["🔒", "🔒", "✓", "💸"];
  const track = t.raw("tracking.steps") as string[];
  const badges = t.raw("verified.badges") as string[];
  const tags = t.raw("verified.tags") as string[];
  const declines = t.raw("board.declines") as string[];

  return (
    <section className="container-x py-8 md:py-12">
      <Block
        eyebrow={t("board.eyebrow")}
        title={t("board.title")}
        visual={
          <>
            <div className="mb-4 flex gap-2">
              <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-accent-foreground">{t("board.price")}</span>
              <span className="rounded-full border border-border-subtle px-3 py-1 text-[11px] font-bold text-text-muted">{t("board.rating")}</span>
              <span className="rounded-full border border-border-subtle px-3 py-1 text-[11px] font-bold text-text-muted">{t("board.eta")}</span>
            </div>
            {[
              { name: "Electrician Pro #17", meta: `★4.9 · ${t("board.etaMin", { min: 40 })}`, price: 1600 },
              { name: "Haider K.", meta: `★4.7 · ${t("board.etaMin", { min: 55 })}`, price: 1850 },
            ].map((b) => (
              <div key={b.name} className="mb-2.5 flex items-center justify-between rounded-xl border border-border-subtle bg-bg-elevated-2 px-3.5 py-3">
                <div>
                  <div className="text-[13px] font-bold">{b.name}</div>
                  <div className="text-[11px] text-text-muted">{b.meta}</div>
                </div>
                <div className="text-sm font-extrabold text-accent">{fmtPKR(b.price, locale)}</div>
              </div>
            ))}
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {declines.map((c) => (
                <span key={c} className={chip}>
                  {c}
                </span>
              ))}
            </div>
          </>
        }
      >
        <p>{t("board.p1")}</p>
        <p>{t("board.p2")}</p>
      </Block>

      <Block
        flip
        tone="secondary"
        eyebrow={t(`${payKey}.eyebrow`)}
        title={t(`${payKey}.title`)}
        visual={
          <>
            <div className="mb-5 flex justify-between">
              {paySteps.map((s, i) => (
                <div key={s} className="relative flex-1 text-center">
                  <div className="mx-auto mb-2 flex h-[32px] w-[32px] items-center justify-center rounded-full bg-secondary text-[13px] font-extrabold text-secondary-foreground">{payIcons[i]}</div>
                  <span className="text-[11px] text-text-muted">{s}</span>
                </div>
              ))}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-bold text-secondary">{t(`${payKey}.badge`)}</div>
            {cash && (
              <div className="mt-4 rounded-xl border border-border-subtle bg-bg-elevated-2 p-3.5 text-xs text-text-muted">
                {t("cash.change")} <b className="text-secondary">{t("cash.approve")}</b>
              </div>
            )}
          </>
        }
      >
        <p>{t(`${payKey}.p1`)}</p>
        <p>{t(`${payKey}.p2`)}</p>
      </Block>

      <Block
        eyebrow={t("tracking.eyebrow")}
        title={t("tracking.title")}
        visual={
          <>
            <div className="relative mb-4 h-[150px] overflow-hidden rounded-xl bg-[repeating-linear-gradient(45deg,#14161d_0_2px,#0d0f14_2px_20px)]">
              <span className="absolute start-[60%] top-[30%] h-3.5 w-3.5 rounded-full bg-accent shadow-[0_0_0_6px_var(--accent-glow)]" />
              <span className="absolute start-[22%] top-[66%] h-2.5 w-2.5 rounded-full bg-danger shadow-[0_0_0_5px_rgba(239,68,68,.25)]" />
            </div>
            <div className="flex flex-wrap gap-2">
              {track.map((s, i) => (
                <span key={s} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${i === 0 ? "border-accent text-accent" : "border-border-subtle text-text-muted"}`}>
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-text-muted">{t("tracking.status")}</p>
          </>
        }
      >
        <p>{t("tracking.p1")}</p>
      </Block>

      <Block
        flip
        eyebrow={t("verified.eyebrow")}
        title={t("verified.title")}
        visual={
          <>
            <div className="mb-3.5 flex flex-wrap gap-2">
              {badges.map((b, i) => (
                <span key={b} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${i === 1 ? "bg-accent text-accent-foreground" : "border border-border-subtle bg-bg-elevated-2 text-text-muted"}`}>
                  {b}
                </span>
              ))}
            </div>
            <div className="rounded-xl border border-border-subtle bg-bg-elevated-2 p-3.5 text-xs text-text-muted">{t("verified.card")}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((x) => (
                <span key={x} className={chip}>
                  {x}
                </span>
              ))}
            </div>
          </>
        }
      >
        <p>{t("verified.p1")}</p>
      </Block>
    </section>
  );
}
