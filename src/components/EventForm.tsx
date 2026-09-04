"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCalendarEvent, updateCalendarEvent, type CalendarEventInput } from "@/app/actions/calendar";
import { addDays, startOfDay } from "@/lib/mealPlanDates";
import { allDayInstantToLocalDay, localDayToAllDayInstant } from "@/lib/calendarDates";
import { EventDateTimeFields, parseLocalDateString } from "./EventDateTimeFields";
import { EventPeopleField } from "./EventPeopleField";
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

  // Timed -> all-day: one day on the current LOCAL start day, converted to
  // the UTC-midnight instant all-day rows are stored as (calendarDates.ts's
  // allDayInstantToLocalDay/localDayToAllDayInstant — mission-13/C3). All-day
  // -> timed: `start` is CURRENTLY a UTC-midnight instant, so it's read back
  // through allDayInstantToLocalDay, never startOfDay directly, before
  // building a plain 9-10 AM default on that local day (a click handler, so
  // unlike the seed above a fixed value is fine — still reviewable before
  // Save).
  function toggleAllDay(next: boolean) {
    if (start && end) {
      if (next) {
        const localDay = startOfDay(start);
        setStart(localDayToAllDayInstant(localDay));
        setEnd(localDayToAllDayInstant(addDays(localDay, 1)));
      } else {
        const day = allDayInstantToLocalDay(start);
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
        <EventDateTimeFields start={start} end={end} allDay={allDay} setStart={setStart} setEnd={setEnd} />
      )}

      <EventPeopleField people={people} selectedUserIds={selectedUserIds} onToggle={togglePerson} />

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
