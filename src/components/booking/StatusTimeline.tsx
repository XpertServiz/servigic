const STEPS = ["PENDING_PAYMENT", "CONFIRMED", "ON_MY_WAY", "ARRIVED", "WORKING", "DONE", "COMPLETED"];
const LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Payment",
  CONFIRMED: "Confirmed",
  ON_MY_WAY: "On the Way",
  ARRIVED: "Arrived",
  WORKING: "Working",
  DONE: "Done",
  COMPLETED: "Released",
};

export function StatusTimeline({ status }: { status: string }) {
  if (status === "DISPUTED" || status === "CANCELLED" || status === "EXPIRED") {
    return (
      <div className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm font-bold text-danger">
        {status}
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <span
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold ${
              i <= currentIndex ? "border-secondary bg-secondary/10 text-secondary" : "border-border-subtle text-text-muted"
            }`}
          >
            {LABELS[step]}
          </span>
          {i < STEPS.length - 1 && <span className="text-text-dim text-text-muted">→</span>}
        </div>
      ))}
    </div>
  );
}
