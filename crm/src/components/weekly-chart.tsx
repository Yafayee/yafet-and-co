"use client";

import { useState } from "react";
import { fmtDayMonth } from "@/lib/dates";

/** Single-series column chart with a hover/focus tooltip. */
export function WeeklyChart({ data }: { data: { week: string; sent: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(10, Math.ceil(Math.max(...data.map((d) => d.sent)) / 10) * 10);
  const ticks = [max, max / 2, 0];
  return (
    <div className="px-5 pb-5 pt-3">
      <div className="flex gap-3">
        <div className="flex h-44 flex-col justify-between text-right text-[11px] text-mute" aria-hidden>
          {ticks.map((t) => <span key={t} className="leading-none">{t}</span>)}
        </div>
        <div className="relative h-44 flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
            {ticks.map((t) => <div key={t} className="border-t border-line/50" />)}
          </div>
          <div className="absolute inset-0 flex items-end gap-[2px]" role="img" aria-label="Messages sent per week over the last 12 weeks">
            {data.map((d, i) => (
              <button
                key={d.week}
                type="button"
                className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`Week of ${fmtDayMonth(d.week)}: ${d.sent} messages`}
              >
                <span
                  className={`w-full max-w-7 rounded-t-[4px] transition-colors ${hover === i ? "bg-[#5aa9f5]" : "bg-primary"} group-focus-visible:ring-2 group-focus-visible:ring-white/60`}
                  style={{ height: `${(d.sent / max) * 100}%` }}
                />
                {hover === i && (
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md border border-line bg-night px-2 py-1 text-xs text-ink shadow-lg"
                    style={{ bottom: `${(d.sent / max) * 100}%` }}>
                    <span className="font-semibold text-white">{d.sent}</span> sent · week of {fmtDayMonth(d.week)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-8 mt-2 flex justify-between text-[11px] text-mute" aria-hidden>
        <span>{fmtDayMonth(data[0].week)}</span>
        <span>{fmtDayMonth(data[Math.floor(data.length / 2)].week)}</span>
        <span>{fmtDayMonth(data[data.length - 1].week)}</span>
      </div>
    </div>
  );
}
