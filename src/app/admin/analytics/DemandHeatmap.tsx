"use client";

import { useEffect, useState } from "react";

type ForecastPoint = { city: string; hourOfDay: number; category: string; forecastJobCount: number };

export function DemandHeatmap() {
  const [forecast, setForecast] = useState<ForecastPoint[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    fetch("/api/ai/demand-heatmap")
      .then((res) => res.json())
      .then((data) => {
        if (data.unavailable) {
          setUnavailable(true);
        } else {
          setForecast(data.forecast ?? []);
        }
      })
      .catch(() => setUnavailable(true));
  }, []);

  if (unavailable) {
    return (
      <p className="text-sm text-text-muted">
        ML demand forecasting needs the ai-service running (AI_SERVICE_URL) — see ai-service/README.md.
      </p>
    );
  }

  if (!forecast) {
    return <p className="text-sm text-text-muted">Loading forecast…</p>;
  }

  if (forecast.length === 0) {
    return <p className="text-sm text-text-muted">Not enough job history yet to forecast demand.</p>;
  }

  const topSlots = [...forecast].sort((a, b) => b.forecastJobCount - a.forecastJobCount).slice(0, 10);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[500px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="py-2 pr-4">City</th>
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4">Hour</th>
            <th className="py-2 pr-4">Forecast jobs</th>
          </tr>
        </thead>
        <tbody>
          {topSlots.map((s, i) => (
            <tr key={i} className="border-t border-border-subtle">
              <td className="py-2 pr-4">{s.city}</td>
              <td className="py-2 pr-4 text-text-muted">{s.category}</td>
              <td className="py-2 pr-4 text-text-muted">{s.hourOfDay}:00</td>
              <td className="py-2 pr-4 font-bold text-accent">{s.forecastJobCount.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
