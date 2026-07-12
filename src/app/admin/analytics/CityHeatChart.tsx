"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function CityHeatChart({ data }: { data: { city: string; jobs: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted">No jobs yet.</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2330" />
          <XAxis dataKey="city" stroke="#9CA0AE" fontSize={12} />
          <YAxis stroke="#9CA0AE" fontSize={12} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "#12141A", border: "1px solid #1F2330", borderRadius: 8 }} />
          <Bar dataKey="jobs" fill="#FFB020" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
