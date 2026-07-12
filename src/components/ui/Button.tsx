import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-bold transition-transform duration-150 whitespace-nowrap hover:-translate-y-0.5";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:shadow-[0_8px_30px_var(--accent-glow)]",
  ghost: "bg-transparent text-text border border-border-subtle hover:border-accent hover:text-accent",
};
const sizes: Record<Size, string> = {
  md: "px-7 py-4 text-[15px]",
  lg: "px-9 py-5 text-[17px]",
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
  return (
    <Link href={href} className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>
  );
}
