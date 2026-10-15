export function Eyebrow({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "secondary" }) {
  const color = tone === "secondary" ? "text-secondary border-secondary/25 bg-secondary/10" : "text-accent border-accent/25 bg-accent/10";
  return (
    <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] ${color}`}>
      {children}
    </div>
  );
}
