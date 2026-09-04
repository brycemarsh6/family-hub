import { addDays, startOfDay } from "@/lib/mealPlanDates";
import { allDayInstantToLocalDay, calendarDayDiff, localDayToAllDayInstant } from "@/lib/calendarDates";

/**
 * The Starts/Ends `<Field>` pair and their shared `DateTimeRow` input, lifted
 * out of EventForm.tsx (mission-13/CT1, contract C1), which sat at its
 * 350-line cap with the Task work still to land on it. `start`/`end` are
 * EventForm's own state — this component receives them (already known
 * non-null; EventForm only renders it once both are seeded) plus their raw
 * setters, and owns every rule for turning a date-input/time-input edit into
 * a new `start`/`end` pair, including the all-day day-span math that used to
 * live in EventForm as `handleStartChange`/`handleAllDayStartChange`.
 *
 * EventForm's own private day-count helper — buggy (`b < a` never
 * terminated; see this file's git history) — was deleted outright rather
 * than fixed, in favor of `calendarDayDiff` (`calendarDates.ts`), which
 * mission-9/C1 already exported and already handles both directions.
 *
 * The "YYYY-MM-DD"/"HH:MM" <-> Date conversions below are local to this
 * file's job (never Date's own UTC-leaning parser — PantryItemEditSheet's
 * toDateInputValue precedent) except `parseLocalDateString`, which EventForm
 * still needs once (seeding a new event's day from `initialDateISO`) and
 * imports back from here rather than keeping a second copy.
 *
 * mission-13/C3 — one more conversion sits on top of the local ones above:
 * `start`/`end` are UTC-midnight instants whenever `allDay` is true
 * (calendarDates.ts's `allDayInstantToLocalDay`/`localDayToAllDayInstant`
 * — see that pair's own doc comment for why). Every place below that reads
 * or builds an all-day date routes through one of those two first, so the
 * native date input always shows and saves the SAME calendar day
 * regardless of the browser's own timezone; a TIMED `start`/`end` never
 * touches either one and keeps reading/writing device-local exactly as
 * before this mission.
 */

/** Local "YYYY-MM-DD" for the native date input. */
function toDateInputValue(date: Date): string {
  const [y, m, d] = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
/** "YYYY-MM-DD" as local midnight, never Date's own UTC-leaning parser. */
export function parseLocalDateString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function combineDateAndTime(dateValue: string, timeValue: string): Date {
  const [h, min] = timeValue.split(":").map(Number);
  const date = parseLocalDateString(dateValue);
  date.setHours(h, min, 0, 0);
  return date;
}

export function EventDateTimeFields({
  start,
  end,
  allDay,
  setStart,
  setEnd,
}: {
  start: Date;
  end: Date;
  allDay: boolean;
  setStart: (date: Date) => void;
  setEnd: (date: Date) => void;
}) {
  // Changing the start keeps the duration (both date and time funnel here).
  function handleStartChange(newStart: Date) {
    const durationMs = end.getTime() - start.getTime();
    setStart(newStart);
    setEnd(new Date(newStart.getTime() + durationMs));
  }

  // All-day equivalent: keep the DAY-count span, not a ms duration.
  // `start`/`end` are UTC-midnight instants when allDay (calendarDates.ts's
  // allDayInstantToLocalDay/localDayToAllDayInstant — mission-13/C3), so the
  // day-count math itself happens entirely in LOCAL calendar-day space
  // (addDays/calendarDayDiff both read the CURRENT environment's own local
  // getters) and only the final setStart/setEnd values are converted back
  // to the UTC instant that gets saved.
  function handleAllDayStartChange(newStartDay: Date) {
    const localStart = allDayInstantToLocalDay(start);
    const localEnd = allDayInstantToLocalDay(end);
    const spanDays = calendarDayDiff(localStart, addDays(localEnd, -1));
    const newLocalStart = startOfDay(newStartDay);
    setStart(localDayToAllDayInstant(newLocalStart));
    setEnd(localDayToAllDayInstant(addDays(newLocalStart, spanDays + 1)));
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Starts">
        <DateTimeRow
          date={allDay ? allDayInstantToLocalDay(start) : start}
          time={start}
          allDay={allDay}
          onDateChange={(picked) => {
            const newStart = new Date(start);
            newStart.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
            if (allDay) handleAllDayStartChange(newStart);
            else handleStartChange(newStart);
          }}
          onTimeChange={(value) => handleStartChange(combineDateAndTime(toDateInputValue(start), value))}
        />
      </Field>

      <Field label={allDay ? "Ends (last day)" : "Ends"}>
        <DateTimeRow
          date={allDay ? addDays(allDayInstantToLocalDay(end), -1) : end}
          time={end}
          allDay={allDay}
          onDateChange={(picked) => {
            if (allDay) {
              // `picked` is already a LOCAL calendar day (parseLocalDateString,
              // via DateTimeRow's date input) — compare and clamp against
              // `start`'s own local calendar day, never its raw UTC-midnight
              // instant, then convert back to a UTC instant only for the save.
              const localStart = allDayInstantToLocalDay(start);
              const clamped = picked.getTime() < localStart.getTime() ? localStart : picked;
              setEnd(localDayToAllDayInstant(addDays(clamped, 1)));
            } else {
              const newEnd = new Date(end);
              newEnd.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
              setEnd(newEnd);
            }
          }}
          onTimeChange={(value) => setEnd(combineDateAndTime(toDateInputValue(end), value))}
        />
      </Field>
    </div>
  );
}

/** One date input, plus a paired time input when not all-day — "Starts"
 * and "Ends" share this shape, differing only in their onChange. */
function DateTimeRow({
  date,
  time,
  allDay,
  onDateChange,
  onTimeChange,
}: {
  date: Date;
  time: Date;
  allDay: boolean;
  onDateChange: (picked: Date) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={toDateInputValue(date)}
        onChange={(e) => {
          if (!e.target.value) return;
          onDateChange(parseLocalDateString(e.target.value));
        }}
        className="min-h-12 flex-1 rounded-xl bg-surface-2 px-4 text-base outline-none"
      />
      {!allDay && (
        <input
          type="time"
          value={toTimeInputValue(time)}
          onChange={(e) => e.target.value && onTimeChange(e.target.value)}
          className="min-h-12 basis-36 shrink-0 rounded-xl bg-surface-2 px-3 text-base outline-none"
        />
      )}
    </div>
  );
}

/** Local to this file, matching the house pattern of a small private
 * `Field` wrapper per form component (RecipeForm.tsx, PantryItemEditSheet.tsx,
 * etc. each keep their own rather than sharing one). */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-muted">
      <span className="mb-1 flex items-baseline justify-between">
        <span>{label}</span>
        {hint && <span className="text-xs">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
