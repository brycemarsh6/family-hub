"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { createCalendarEvent, updateCalendarEvent, type CalendarEventInput } from "@/app/actions/calendar";
import { addDays, isSameDay, startOfDay } from "@/lib/mealPlanDates";
import type { CalendarPersonView } from "@/lib/types";

// A new event's default start needs the browser's real clock; only
// useToday() (day-granular) exists in src/lib/, off this contract's
// boundary. Same useSyncExternalStore shape as that hook (getServerSnapshot
// `null`) — a plain useEffect+setState trips this repo's lint rule.
function subscribeToClock(callback: () => void) {
  const interval = setInterval(callback, 30_000);
  return () => clearInterval(interval);
}
function getBrowserMinute(): number {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.getTime();
}

export type EventFormDefaults = {
  id: string;
  title: string;
  allDay: boolean;
  startAt: Date;
  endAt: Date;
  location: string;
  notes: string;
  userIds: string[];
};

/** Local "YYYY-MM-DD"/"HH:MM" for the native inputs — PantryItemEditSheet's
 * own toDateInputValue trick, so an evening edit never rolls back a day
 * through UTC. */
function toDateInputValue(date: Date): string {
  const [y, m, d] = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
/** "YYYY-MM-DD" as local midnight, never Date's own UTC-leaning parser. */
function parseLocalDateString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function combineDateAndTime(dateValue: string, timeValue: string): Date {
  const [h, min] = timeValue.split(":").map(Number);
  const date = parseLocalDateString(dateValue);
  date.setHours(h, min, 0, 0);
  return date;
}

/** Whole calendar days from `a` to `b` (`b` >= `a`, both local midnight),
 * via addDays/isSameDay — a tiny private copy of calendarDates.ts's
 * unexported calendarDayDiff (off this may-touch list). */
function daysBetween(a: Date, b: Date): number {
  let count = 0;
  let cursor = a;
  while (!isSameDay(cursor, b)) {
    cursor = addDays(cursor, 1);
    count += 1;
  }
  return count;
}

/** One form for both New and Edit (the RecipeForm precedent) — calls
 * createCalendarEvent/updateCalendarEvent with a plain object, not
 * useActionState+FormData, per C1's binding contract note. `start`/`end`
 * seed once for a new event via React's "adjust state during render"
 * pattern (guarded by `start === null`), not an effect — see
 * subscribeToClock's comment above. */
export function EventForm({
  people, // full household roster, kids included — an event can be FOR a kid
  currentUserId,
  defaultValues,
  initialDateISO, // "YYYY-MM-DD" day in view when "+" was tapped, ignored
  // once editing — a string, built into a Date only here (see new/page.tsx).
}: {
  people: CalendarPersonView[];
  currentUserId: string;
  defaultValues?: EventFormDefaults;
  initialDateISO?: string;
}) {
  const router = useRouter();
  const isEdit = defaultValues !== undefined;

  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [allDay, setAllDay] = useState(defaultValues?.allDay ?? false);
  const [start, setStart] = useState<Date | null>(defaultValues?.startAt ?? null);
  const [end, setEnd] = useState<Date | null>(defaultValues?.endAt ?? null);
  const [location, setLocation] = useState(defaultValues?.location ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    defaultValues?.userIds ?? [currentUserId],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const browserMinute = useSyncExternalStore(subscribeToClock, getBrowserMinute, () => null);

  // Fires once (guarded by start === null), then never overwrites the user's own values.
  if (!isEdit && start === null && browserMinute !== null) {
    const now = new Date(browserMinute);
    const seedDay = initialDateISO ? parseLocalDateString(initialDateISO) : startOfDay(now);
    const nextHour = (now.getMinutes() === 0 ? now.getHours() : now.getHours() + 1) % 24;
    const seededStart = new Date(seedDay.getFullYear(), seedDay.getMonth(), seedDay.getDate(), nextHour);
    setStart(seededStart);
    setEnd(new Date(seededStart.getTime() + 60 * 60 * 1000));
  }

  // Changing the start keeps the duration (both date and time funnel here).
  function handleStartChange(newStart: Date) {
    const durationMs = start && end ? end.getTime() - start.getTime() : 60 * 60 * 1000;
    setStart(newStart);
    setEnd(new Date(newStart.getTime() + durationMs));
  }

  // All-day equivalent: keep the DAY-count span, not a ms duration.
  function handleAllDayStartChange(newStartDay: Date) {
    if (!start || !end) return;
    const spanDays = daysBetween(startOfDay(start), addDays(startOfDay(end), -1));
    const newStart = startOfDay(newStartDay);
    setStart(newStart);
    setEnd(addDays(newStart, spanDays + 1));
  }

  // Timed -> all-day: one day on the current start day. All-day -> timed:
  // same day, a plain 9-10 AM default (a click handler, so unlike the seed
  // above a fixed value is fine — still reviewable before Save).
  function toggleAllDay(next: boolean) {
    if (start && end) {
      if (next) {
        setStart(startOfDay(start));
        setEnd(addDays(startOfDay(start), 1));
      } else {
        const day = startOfDay(start);
        const newStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9);
        setStart(newStart);
        setEnd(new Date(newStart.getTime() + 3600_000));
      }
    }
    setAllDay(next);
  }

  function togglePerson(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!start || !end) return;
    if (!title.trim()) return setError("Give the event a title.");
    if (selectedUserIds.length === 0) return setError("Add at least one person.");

    const input: CalendarEventInput = {
      title: title.trim(),
      notes: notes.trim() || null,
      location: location.trim() || null,
      startAt: start,
      endAt: end,
      allDay,
      userIds: selectedUserIds,
    };

    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateCalendarEvent(defaultValues.id, input)
        : await createCalendarEvent(input);
      if (result.error) return setError(result.error);
      router.push("/calendar");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Title">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
          autoFocus
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
        />
      </Field>

      <label className="flex min-h-12 items-center justify-between rounded-xl bg-surface-2 px-4">
        <span className="text-base font-medium">All day</span>
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => toggleAllDay(e.target.checked)}
          className="h-6 w-6 accent-accent"
        />
      </label>

      {start && end && (
        <div className="flex flex-col gap-3">
          <Field label="Starts">
            <DateTimeRow
              date={start}
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
              date={allDay ? addDays(startOfDay(end), -1) : end}
              time={end}
              allDay={allDay}
              onDateChange={(picked) => {
                if (allDay) {
                  const clamped = picked.getTime() < start.getTime() ? start : picked;
                  setEnd(addDays(startOfDay(clamped), 1));
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
      )}

      <Field label="People">
        <div className="flex flex-wrap gap-2">
          {people.map((person) => {
            const selected = selectedUserIds.includes(person.userId);
            return (
              <button
                key={person.userId}
                type="button"
                onClick={() => togglePerson(person.userId)}
                aria-pressed={selected}
                className={`flex min-h-12 items-center gap-2 rounded-full border px-3 pl-1.5 text-left text-sm font-medium transition-colors ${
                  selected ? "border-accent bg-accent-soft text-fg" : "border-line bg-surface text-muted"
                }`}
              >
                <AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} size={32} />
                {person.displayName}
                {selected && <Check aria-hidden="true" size={16} className="text-accent" />}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Location" hint="Optional">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          autoComplete="off"
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
        />
      </Field>

      <Field label="Notes" hint="Optional">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-xl bg-surface-2 px-4 py-3 text-base outline-none"
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !start || !end}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Saving…" : isEdit ? "Save changes" : "Add event"}
      </button>
    </form>
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
