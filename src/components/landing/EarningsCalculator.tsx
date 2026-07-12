"use client";

import { useState } from "react";

function fmt(n: number) {
  return `PKR ${Math.round(n).toLocaleString("en-US")}`;
}

export function EarningsCalculator() {
  const [jobsPerWeek, setJobsPerWeek] = useState(8);
  const [avgTicket, setAvgTicket] = useState(2500);
  const monthly = jobsPerWeek * 4.33 * avgTicket * 0.88;

  return (
    <>
      <div className="mb-4 rounded-[10px] border border-border-subtle bg-bg-elevated-2 p-4">
        <label className="text-[13px] text-text-muted">
          Jobs per week: <b className="text-text">{jobsPerWeek}</b> · Avg ticket: <b className="text-text">{fmt(avgTicket)}</b>
        </label>
        <input
          type="range"
          min={1}
          max={30}
          value={jobsPerWeek}
          onChange={(e) => setJobsPerWeek(Number(e.target.value))}
          className="mt-2 w-full accent-accent"
        />
        <input
          type="range"
          min={500}
          max={10000}
          step={100}
          value={avgTicket}
          onChange={(e) => setAvgTicket(Number(e.target.value))}
          className="mt-3 w-full accent-accent"
        />
      </div>
      <div className="mb-4 flex flex-col items-center gap-1 rounded-[10px] border border-border-subtle bg-bg-elevated-2 p-4">
        <label className="text-[13px] text-text-muted">Estimated monthly earnings</label>
        <div className="font-display text-3xl font-bold text-secondary">{fmt(monthly)}</div>
      </div>
    </>
  );
}
