"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { bookableDays, dateLabel, dayPart, flexibleFor, sameDay, slotsFor, timeLabel, windowText, type DayPart } from "@/lib/scheduleSlots";

export interface ScheduleValue {
  scheduledAt: string; // ISO
  scheduledWindowMins: number;
}

const PARTS: { key: DayPart; label: string; icon: string }[] = [
  { key: "morning", label: "Morning", icon: "🌅" },
  { key: "afternoon", label: "Afternoon", icon: "☀️" },
  { key: "evening", label: "Evening", icon: "🌙" },
];

/** Day first, then the arrival window on that day (one hour, or "any time that day"). */
export function SchedulePicker({ value, onChange }: { value: ScheduleValue | null; onChange: (v: ScheduleValue | null) => void }) {
  const locale = useLocale();
  const days = useMemo(() => bookableDays(), []);
  const [day, setDay] = useState<Date | null>(value ? new Date(value.scheduledAt) : null);
  const slots = useMemo(() => (day ? slotsFor(day) : []), [day]);
  const flexible = useMemo(() => (day ? flexibleFor(day) : null), [day]);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const dayName = (d: Date) => (sameDay(d, today) ? "Today" : sameDay(d, tomorrow) ? "Tomorrow" : dateLabel(d, locale));
  const chosen = value ? new Date(value.scheduledAt).getTime() : null;
  const isFlexible = Boolean(value && value.scheduledWindowMins > 60);

  const chip = (active: boolean) =>
    `rounded-[12px] border px-3 py-2 text-sm transition-colors ${active ? "border-accent bg-accent/15 font-bold text-accent" : "border-border-subtle bg-bg-elevated hover:border-accent/50"}`;

  return (
    <div className="rounded-[14px] border border-border-subtle bg-bg-elevated/60 p-4">
      <div className="mb-2 text-sm font-semibold">1. Choose the day</div>
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((d) => (
          <button
            type="button"
            key={d.toISOString()}
            onClick={() => {
              setDay(d);
              onChange(null);
            }}
            className={`${chip(Boolean(day && sameDay(d, day)))} flex-none text-center`}
          >
            <div className="text-[11px] uppercase opacity-70">{dayName(d) === "Today" || dayName(d) === "Tomorrow" ? dayName(d) : new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d)}</div>
            <div className="text-lg font-bold leading-tight">{d.getDate()}</div>
            <div className="text-[11px] opacity-70">{new Intl.DateTimeFormat(locale, { month: "short" }).format(d)}</div>
          </button>
        ))}
      </div>

      {day && (
        <>
          <div className="mb-2 text-sm font-semibold">2. Choose when the pro should arrive</div>
          {flexible && (
            <button type="button" onClick={() => onChange({ scheduledAt: flexible.start.toISOString(), scheduledWindowMins: flexible.minutes })} className={`${chip(isFlexible)} mb-3 w-full text-start`}>
              🕐 Any time that day ({timeLabel(flexible.start, locale)}–{timeLabel(new Date(flexible.start.getTime() + flexible.minutes * 60_000), locale)}) <span className="text-xs text-secondary">· more pros can bid</span>
            </button>
          )}
          {PARTS.map((p) => {
            const list = slots.filter((s) => dayPart(s.start) === p.key);
            if (list.length === 0) return null;
            return (
              <div key={p.key} className="mb-3">
                <div className="mb-1.5 text-xs text-text-muted">
                  {p.icon} {p.label}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {list.map((s) => (
                    <button
                      type="button"
                      key={s.start.toISOString()}
                      onClick={() => onChange({ scheduledAt: s.start.toISOString(), scheduledWindowMins: s.minutes })}
                      className={chip(!isFlexible && chosen === s.start.getTime())}
                    >
                      {timeLabel(s.start, locale)}–{timeLabel(new Date(s.start.getTime() + s.minutes * 60_000), locale)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {value && (
        <div className="mt-2 rounded-[10px] border border-secondary/40 bg-secondary/10 p-3 text-sm">
          <b>✅ {windowText(value.scheduledAt, value.scheduledWindowMins, locale)}</b>
          <div className="mt-0.5 text-xs text-text-muted">The pro arrives in this window. We remind you and your pro a day before and an hour before.</div>
        </div>
      )}
    </div>
  );
}
