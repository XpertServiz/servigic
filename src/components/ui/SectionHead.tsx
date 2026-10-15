import { Eyebrow } from "@/components/landing/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";

export function SectionHead({ eyebrow, title, sub, align = "start", tone }: { eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; align?: "start" | "center"; tone?: "accent" | "secondary" }) {
  return (
    <Reveal className={`mb-12 max-w-[720px] md:mb-16 ${align === "center" ? "mx-auto text-center" : ""}`}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2 className="text-[clamp(28px,4.6vw,48px)] font-bold leading-[1.1] tracking-[-0.018em]">{title}</h2>
      {sub && <p className="mt-4 text-base text-text-muted md:text-lg">{sub}</p>}
    </Reveal>
  );
}
