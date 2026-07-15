import { prisma } from "@/lib/prisma";
import { getTimelineDurationMinutes } from "@/lib/jobDuration";
import { DurationGauges } from "./DurationGauges";

export interface TradeDurationStat {
  category: string;
  icon: string;
  count: number;
  avgMinutes: number;
  minMinutes: number;
  maxMinutes: number;
}

export default async function AdminDurationsPage() {
  const bookings = await prisma.booking.findMany({
    where: { status: "COMPLETED" },
    select: { timeline: true, job: { select: { category: { select: { name: true, icon: true } } } } },
  });

  const byCategory = new Map<string, { icon: string; durations: number[] }>();
  for (const b of bookings) {
    const totalMinutes = getTimelineDurationMinutes(b.timeline, "CONFIRMED", "COMPLETED");
    if (totalMinutes === null) continue;
    const name = b.job.category.name;
    const entry = byCategory.get(name) ?? { icon: b.job.category.icon, durations: [] };
    entry.durations.push(totalMinutes);
    byCategory.set(name, entry);
  }

  const stats: TradeDurationStat[] = Array.from(byCategory.entries())
    .map(([category, { icon, durations }]) => ({
      category,
      icon,
      count: durations.length,
      avgMinutes: Math.round(durations.reduce((s, d) => s + d, 0) / durations.length),
      minMinutes: Math.min(...durations),
      maxMinutes: Math.max(...durations),
    }))
    .sort((a, b) => b.avgMinutes - a.avgMinutes);

  const overall = stats.length
    ? {
        avgMinutes: Math.round(stats.reduce((s, t) => s + t.avgMinutes * t.count, 0) / stats.reduce((s, t) => s + t.count, 0)),
        minMinutes: Math.min(...stats.map((t) => t.minMinutes)),
        maxMinutes: Math.max(...stats.map((t) => t.maxMinutes)),
        count: stats.reduce((s, t) => s + t.count, 0),
      }
    : null;

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Job Durations</h1>
      <p className="mb-8 text-text-muted">
        Time from payment confirmation to job completion, per trade — for staffing, pricing, and SLA decisions.
      </p>
      <DurationGauges stats={stats} overall={overall} />
    </div>
  );
}
