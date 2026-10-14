import { cn } from "@/lib/cn";

// Depth layers behind the front face; the stack is what makes the "S" read as a solid object.
const DEPTH = Array.from({ length: 12 }, (_, i) => i);

/**
 * Servigic 3D logo mark: the amber "S" extruded from stacked glyph layers, with
 * the red "live" dot floating in front. Pure CSS (styles in globals.css), so it
 * renders before any JS and works in Server Components, the splash, loading.tsx
 * and the route progress bar.
 */
export function LogoMark3D({ size = 72, className, variant = "swing" }: { size?: number; className?: string; variant?: "swing" | "spin" | "still" }) {
  return (
    <span className={cn("sv-mark-stage", className)} style={{ ["--s" as string]: `${size}px` }} aria-hidden>
      <span className={cn("sv-mark", variant === "spin" && "sv-mark--spin", variant === "still" && "sv-mark--still")}>
        {DEPTH.map((i) => (
          <span key={i} className="sv-layer" style={{ ["--i" as string]: i }}>S</span>
        ))}
        <span className="sv-layer sv-layer--front">S</span>
        <span className="sv-dot" />
      </span>
      <span className="sv-mark-shadow" />
    </span>
  );
}
