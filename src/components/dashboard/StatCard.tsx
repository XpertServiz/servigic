export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
      <div className="font-display text-3xl font-bold text-accent">{value}</div>
      <div className="mt-1 text-sm text-text-muted">{label}</div>
    </div>
  );
}
