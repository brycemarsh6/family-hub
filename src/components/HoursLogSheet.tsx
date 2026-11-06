"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { addHabitTime } from "@/app/actions/habitHours";
import { HOURS_LIMITS, LOG_SHEET_WORDS } from "@/lib/habitHoursVocabulary";
import type { HabitChange } from "@/lib/habitChanges";
import { addHoursMinutes, formatAmount, type HoursRowView } from "@/lib/habitsHours";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { addCalendarDays, calendarDateInZone, calendarDaysBetween, formatCalendarDate, startOfWeek } from "@/lib/householdDate";

/** The same shape as `useOptimisticRun`'s `run`: show the change now, await the save, call `onSuccess` only when it worked. */
export type RunChange = (change: HabitChange, action: () => Promise<{ error?: string }>, onSuccess?: () => void) => void;

/** The amounts the chips jump to (decision 182); a chip is lit only when it equals the amount (decision 191). */
const CHIPS = [30, 60, 120] as const;
const DAYS = LOG_SHEET_WORDS.day;
const BUTTON_ROUND = "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-fg transition-colors active:bg-line disabled:opacity-40";
const CHIP = "flex min-h-12 items-center rounded-full border px-5 text-base";
const chipClass = (lit: boolean) => `${CHIP} ${lit ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-surface font-semibold"}`;

/**
 * "Add time to Calling" (decision 191): a stepper in half-hour steps (never
 * typed), the chips 30 min, 1 hour and 2 hours, Today / Yesterday / Other day
 * (the last 7 days, as a late check), what the week reads after this, and a
 * button that says what it adds. The bar behind moves at once through `run`
 * (the caller's optimistic wrapper); the sheet stays open while it saves, shows
 * a failure inline (`error`, the caller's) and closes itself on success. The
 * day comes from the browser's clock in the household zone; only a day in this
 * week moves the bar (a day in last week is saved, not drawn).
 */
export function HoursLogSheet({
  habitId,
  title,
  hours,
  forUserId,
  forName,
  run,
  pending,
  error,
  onClose,
}: {
  habitId: string;
  title: string;
  /** The person's week before this entry. */
  hours: HoursRowView;
  /** Whose time this is; the viewer's own when left off. */
  forUserId: string;
  /** Shown under the title on a shared screen ("for Emily"). */
  forName?: string;
  run: RunChange;
  pending: boolean;
  error: string | null;
  onClose: () => void;
}) {
  // The sheet only mounts after a tap, so reading the clock here cannot disagree with the server render.
  // The week as it was when the sheet opened: the bar behind moves as soon as Add is tapped, and "after this" must not count the entry twice.
  const [before] = useState(hours);
  const [today] = useState(() => calendarDateInZone(new Date(), HOUSEHOLD_TIME_ZONE));
  const [minutes, setMinutes] = useState<number>(HOURS_LIMITS.entryDefault);
  const [day, setDay] = useState(today);
  const [other, setOther] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const { entryStep, entryMin, entryMax } = HOURS_LIMITS;
  const yesterday = addCalendarDays(today, -1);
  const litToday = !other && calendarDaysBetween(day, today) === 0;
  const litYesterday = !other && calendarDaysBetween(day, yesterday) === 0;
  const thisWeek = calendarDaysBetween(startOfWeek(today), day) >= 0;
  const amount = formatAmount(minutes);
  const after = thisWeek ? LOG_SHEET_WORDS.afterThis(addHoursMinutes(before, minutes).doneText) : LOG_SHEET_WORDS.lastWeek(amount);
  const dayIso = formatCalendarDate(day);

  function save() {
    run({ type: "addTime", habitId, userId: forUserId, minutes: thisWeek ? minutes : 0 }, () => addHabitTime(habitId, forUserId, dayIso, minutes), onClose);
  }

  function pickDay(next: typeof today) {
    setDay(next);
    setOther(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={LOG_SHEET_WORDS.title(title)}
        className="relative flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{LOG_SHEET_WORDS.title(title)}</h2>
            {forName && <p className="text-sm text-muted">for {forName}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-muted active:bg-surface-2">
            <X aria-hidden="true" size={22} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setMinutes(Math.max(entryMin, minutes - entryStep))} disabled={minutes <= entryMin} aria-label="Less time" className={BUTTON_ROUND}>
            <Minus aria-hidden="true" size={24} />
          </button>
          <p aria-live="polite" className="min-w-0 flex-1 text-center text-3xl font-bold tabular-nums">
            {amount}
          </p>
          <button type="button" onClick={() => setMinutes(Math.min(entryMax, minutes + entryStep))} disabled={minutes >= entryMax} aria-label="More time" className={BUTTON_ROUND}>
            <Plus aria-hidden="true" size={24} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button key={chip} type="button" onClick={() => setMinutes(chip)} aria-pressed={minutes === chip} className={chipClass(minutes === chip)}>
              {formatAmount(chip)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted">Day</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => pickDay(today)} aria-pressed={litToday} className={chipClass(litToday)}>
              {DAYS.today}
            </button>
            <button type="button" onClick={() => pickDay(yesterday)} aria-pressed={litYesterday} className={chipClass(litYesterday)}>
              {DAYS.yesterday}
            </button>
            <button type="button" onClick={() => setOther(!other)} aria-expanded={other} aria-pressed={other} className={chipClass(other)}>
              {DAYS.other}
            </button>
          </div>
          {other && (
            <input
              type="date"
              aria-label={`${DAYS.other} for ${title}`}
              min={formatCalendarDate(addCalendarDays(today, -7))}
              max={formatCalendarDate(today)}
              value={dayIso}
              onChange={(event) => {
                const [year, month, dayOfMonth] = event.target.value.split("-").map(Number);
                if (year && month && dayOfMonth) setDay({ year, month, day: dayOfMonth });
              }}
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base text-fg outline-none"
            />
          )}
        </div>

        <p className="text-sm text-muted">{after}</p>

        {error && (
          <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
            {error}
          </p>
        )}

        <button type="button" onClick={save} disabled={pending} className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50">
          {pending ? LOG_SHEET_WORDS.saving : LOG_SHEET_WORDS.button(amount)}
        </button>
      </div>
    </div>
  );
}
