import { clsx } from "clsx";
import type { ReactNode } from "react";
import { LLink } from "@/components/i18n/LLink";

type Variant = "primary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[transform,box-shadow,border-color,color,background-color] duration-200 whitespace-nowrap hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const variants: Record<Variant, string> = {
  primary:
    "sv-shine bg-gradient-to-b from-[#ffc24a] to-accent text-accent-foreground shadow-[0_6px_24px_-6px_var(--accent-glow)] hover:shadow-[0_10px_36px_-4px_var(--accent-glow)]",
  ghost: "border border-white/12 bg-white/[0.03] text-text backdrop-blur hover:border-accent/60 hover:bg-accent/[0.07] hover:text-accent",
};
const sizes: Record<Size, string> = {
  md: "px-6 py-3 text-[15px]",
  lg: "px-8 py-4 text-base",
};

export function Button({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  const cls = clsx(base, variants[variant], sizes[size], className);
  if (href.startsWith("#") || /^https?:/.test(href)) {
    return (
      <a href={href} className={cls} {...props}>
        {children}
      </a>
    );
  }
  return (
    <LLink href={href} className={cls} {...props}>
      {children}
    </LLink>
  );
}
