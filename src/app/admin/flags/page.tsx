import { prisma } from "@/lib/prisma";
import { runCollusionDetection } from "@/lib/collusionDetection";
import { FlagRow } from "./FlagRow";

export default async function AdminFlagsPage() {
  await runCollusionDetection();

  const flags = await prisma.providerFlag.findMany({
    where: { status: "OPEN" },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    include: {
      provider: { include: { user: { select: { name: true, phone: true } } } },
      customer: { select: { name: true, phone: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Flags</h1>
      <p className="mb-8 text-text-muted">
        Anti-bypass collusion signals (v7) — accept-then-cancel pairs, rebook avoidance, contact-sharing attempts.
        Review the evidence trail and act.
      </p>

      <div className="flex flex-col gap-3">
        {flags.map((f) => (
          <FlagRow key={f.id} flag={f} />
        ))}
        {flags.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No open flags.
          </div>
        )}
      </div>
    </div>
  );
}
