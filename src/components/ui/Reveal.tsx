"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** Fades/slides children in as they scroll into view. Visible without JS (the hidden state only applies under html.js). */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "li" | "section" | "article" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Component = Tag as "div";
  return (
    <Component ref={ref} className={cn("sv-reveal", className)} style={{ ["--d" as string]: `${delay}ms` }}>
      {children}
    </Component>
  );
}
