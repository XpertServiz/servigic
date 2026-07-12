export function Eyebrow({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "secondary" }) {
  const color = tone === "secondary" ? "text-secondary border-secondary/25 bg-secondary/10" : "text-accent border-accent/25 bg-accent/10";
  return (
    <div className={`inline-flex items-center gap-2 text-[13px] font-semibold tracking-wide uppercase px-3.5 py-1.5 rounded-full border mb-5 ${color}`}>
      {children}
    </div>
  );
}
