import { Eyebrow } from "@/components/landing/Eyebrow";

const ROWS: [string, { text: string; good: boolean }[]][] = [
  [
    "On-site price",
    [
      { text: "Balloons ✕", good: false },
      { text: "Unknown ✕", good: false },
      { text: "N/A ✕", good: false },
      { text: "Locked in escrow ✓", good: true },
    ],
  ],
  [
    "Verification",
    [
      { text: "Varies ✕", good: false },
      { text: "None ✕", good: false },
      { text: "Varies ✕", good: false },
      { text: "CNIC + police-verified ✓", good: true },
    ],
  ],
  [
    "Pro cost model",
    [
      { text: "N/A", good: false },
      { text: "N/A", good: false },
      { text: "Pay for dead leads ✕", good: false },
      { text: "Commission only on completed jobs ✓", good: true },
    ],
  ],
  [
    "Live tracking",
    [
      { text: "✕", good: false },
      { text: "✕", good: false },
      { text: "✕", good: false },
      { text: "✓", good: true },
    ],
  ],
];

const COLUMNS = ["Fixed-price apps", "WhatsApp-group mistri", "Lead-selling platforms", "Servigic"];

export function WhySection() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
      <div className="mb-16 max-w-[640px]">
        <Eyebrow>Why Servigic</Eyebrow>
        <h2 className="font-display text-[clamp(32px,5vw,52px)] font-bold uppercase leading-tight">
          BRUTALLY HONEST COMPARISON.
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-border-subtle p-4 text-left" />
              {COLUMNS.map((c) => (
                <th
                  key={c}
                  className="border-b border-border-subtle p-4 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, cells]) => (
              <tr key={label}>
                <td className="border-b border-border-subtle p-4 font-semibold text-text-muted">{label}</td>
                {cells.map((c, i) => (
                  <td key={i} className={`border-b border-border-subtle p-4 font-bold ${c.good ? "text-secondary" : "text-danger"}`}>
                    {c.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
