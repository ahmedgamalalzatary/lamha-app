'use client';

import { isTimeOfDay, type ShiftRange, WEEK_DAY_NAMES, type WeekSchedule } from '@tawsela/shared';

/** A new working day starts with these hours until changed. */
const NEW_DAY: ShiftRange = { start: '18:00', end: '02:00' };

/** Every day has times when it has a shift. */
export const isWeekReady = (week: WeekSchedule) => week.every((d) => d === null || (isTimeOfDay(d.start) && isTimeOfDay(d.end)));

/**
 * The week from Sunday (§15.1 #5): a day is ticked when it has a shift, with its start and end in
 * Cairo time. An end before the start runs past midnight. [Open] name and layout ours.
 */
export function WeekEditor({ week, onChange }: { week: WeekSchedule; onChange: (week: WeekSchedule) => void }) {
  const setDay = (i: number, day: ShiftRange | null) => onChange(week.map((d, j) => (j === i ? day : d)));
  return (
    <div className="flex flex-col divide-y divide-tw-line rounded-xl border border-tw-line">
      {WEEK_DAY_NAMES.map((name, i) => {
        const day = week[i] ?? null;
        return (
          <div key={name} className="flex flex-wrap items-center gap-4 px-4 py-3 text-sm">
            <label className="flex w-28 items-center gap-2 font-semibold">
              <input type="checkbox" checked={day !== null} onChange={(e) => setDay(i, e.target.checked ? NEW_DAY : null)} className="size-4 accent-tw" />
              {name}
            </label>
            {day ? (
              <>
                <label className="flex items-center gap-2">
                  من
                  <input
                    type="time"
                    aria-label={`${name} من`}
                    value={day.start}
                    onChange={(e) => setDay(i, { ...day, start: e.target.value })}
                    className="h-10 rounded-lg bg-tw-input px-3"
                  />
                </label>
                <label className="flex items-center gap-2">
                  إلى
                  <input
                    type="time"
                    aria-label={`${name} إلى`}
                    value={day.end}
                    onChange={(e) => setDay(i, { ...day, end: e.target.value })}
                    className="h-10 rounded-lg bg-tw-input px-3"
                  />
                </label>
                {day.end <= day.start ? <span className="text-xs text-tw-ink-2">ينتهي في اليوم التالي</span> : null}
              </>
            ) : (
              <span className="text-tw-ink-2">لا توجد نوبة</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
