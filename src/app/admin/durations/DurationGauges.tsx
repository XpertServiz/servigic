"use client";

import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import type { TradeDurationStat } from "./page";

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
}

const GAUGE_COLORS = ["#FFB020", "#22C55E", "#3B82F6", "#EF4444", "#A855F7", "#14B8A6", "#F97316", "#EC4899"];

function Gauge({ stat, maxScale, color }: { stat: TradeDurationStat; maxScale: number; color: string }) {
  const pct = Math.min(100, Math.round((stat.avgMinutes / maxScale) * 100));
  const data = [{ name: stat.category, value: pct, fill: color }];

  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">{stat.icon}</span>
        <span className="font-semibold">{stat.category}</span>
      </div>
      <div className="relative h-40">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            barSize={14}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#1F2330" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold">{formatDuration(stat.avgMinutes)}</span>
          <span className="text-xs text-text-muted">avg</span>
        </div>
      </div>
      <div className="mt-3 flex justify-between text-xs text-text-muted">
        <span>Min {formatDuration(stat.minMinutes)}</span>
        <span>{stat.count} job{stat.count === 1 ? "" : "s"}</span>
        <span>Max {formatDuration(stat.maxMinutes)}</span>
      </div>
    </div>
  );
}

export function DurationGauges({
  stats,
  overall,
}: {
  stats: TradeDurationStat[];
  overall: { avgMinutes: number; minMinutes: number; maxMinutes: number; count: number } | null;
}) {
  if (!overall || stats.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
        No completed jobs yet — durations will appear here once bookings finish.
      </div>
    );
  }

  const maxScale = Math.max(...stats.map((s) => s.avgMinutes)) * 1.15;

  return (
    <div>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
          <div className="text-xs text-text-muted">Overall Average</div>
          <div className="font-display text-xl font-bold text-accent">{formatDuration(overall.avgMinutes)}</div>
        </div>
        <div className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
          <div className="text-xs text-text-muted">Fastest Job</div>
          <div className="font-display text-xl font-bold text-secondary">{formatDuration(overall.minMinutes)}</div>
        </div>
        <div className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
          <div className="text-xs text-text-muted">Longest Job</div>
          <div className="font-display text-xl font-bold text-danger">{formatDuration(overall.maxMinutes)}</div>
        </div>
        <div className="rounded-[12px] border border-border-subtle bg-bg-elevated p-4">
          <div className="text-xs text-text-muted">Completed Jobs</div>
          <div className="font-display text-xl font-bold">{overall.count}</div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <Gauge key={stat.category} stat={stat} maxScale={maxScale} color={GAUGE_COLORS[i % GAUGE_COLORS.length]} />
        ))}
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="p-4">Trade</th>
              <th className="p-4">Jobs</th>
              <th className="p-4">Average</th>
              <th className="p-4">Min</th>
              <th className="p-4">Max</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.category} className="border-t border-border-subtle">
                <td className="p-4 font-semibold">
                  {stat.icon} {stat.category}
                </td>
                <td className="p-4 text-text-muted">{stat.count}</td>
                <td className="p-4 font-semibold text-accent">{formatDuration(stat.avgMinutes)}</td>
                <td className="p-4 text-text-muted">{formatDuration(stat.minMinutes)}</td>
                <td className="p-4 text-text-muted">{formatDuration(stat.maxMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
