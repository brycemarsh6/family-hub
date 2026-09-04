"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { createTask, updateTask, type TaskInput } from "@/app/actions/tasks";
import { allDayInstantToLocalDay, localDayToAllDayInstant } from "@/lib/calendarDates";
import { parseLocalDateString } from "./EventDateTimeFields";
import { EventPeopleField } from "./EventPeopleField";
import { useToday } from "@/lib/useToday";
import type { CalendarPersonView } from "@/lib/types";

/** Local "YYYY-MM-DD" for the native date input — the same private helper
 * EventDateTimeFields.tsx keeps for its own job (that file only exports
 * parseLocalDateString, the one conversion EventForm needs back from it;
 * everything else stays a per-file copy, matching the house pattern that
 * file's own doc comment names). */
function toDateInputValue(date: Date): string {
  const [y, m, d] = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export type TaskFormDefaults = {
  id: string;
  title: string;
  details: string;
  /** The stored UTC-midnight instant (Task.dueDate) — converted to a local
   * calendar day once, in the constructor below, via
   * allDayInstantToLocalDay. Never read with local getters directly. */
  dueDate: Date;
  userIds: string[];
};

/**
 * One form for both New and Edit (the EventForm/RecipeForm precedent).
 * Calls createTask/updateTask with a plain object, not useActionState +
 * FormData — TaskForm composes a real Date client-side (the due-date
 * field) before calling either action, same reasoning as EventForm.
 *
 * Deliberately does NOT reuse EventDateTimeFields: that component is built
 * for a start/end RANGE (two dates, a duration, an all-day day-span) and a
 * task has exactly one all-day due date — contorting a range picker into a
 * single-date field would mean threading a fake "end" through it for no
 * reason. A plain native date input, converted through the same
 * localDayToAllDayInstant/allDayInstantToLocalDay pair EventDateTimeFields
 * itself uses for all-day dates, is the whole job here.
 *
 * "Does not repeat" is a plain, non-interactive row rather than a working
 * control — rrule has no UI until K4 (see actions/tasks.ts's own header
 * comment). It's shown so the eventual control has a fixed place to land,
 * per this app's "no feature is stubbed out early" rule, without pretending
 * to be tappable today.
 */
export function TaskForm({
  people, // full household roster, kids included — a task can be FOR a kid
  currentUserId,
  defaultValues,
  initialDateISO, // "YYYY-MM-DD" day in view when "+" was tapped, ignored
  // once editing — a string, built into a Date only here (see new/task/page.tsx).
}: {
  people: CalendarPersonView[];
  currentUserId: string;
  defaultValues?: TaskFormDefaults;
  initialDateISO?: string;
}) {
  const router = useRouter();
  const isEdit = defaultValues !== undefined;

  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [details, setDetails] = useState(defaultValues?.details ?? "");
  const [dueDay, setDueDay] = useState<Date | null>(
    defaultValues ? allDayInstantToLocalDay(defaultValues.dueDate) : null,
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    defaultValues?.userIds ?? [currentUserId],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Day-granular only — a task's due date has no time component, so
  // useToday() (local midnight, null during SSR/first client render) is
  // enough; EventForm's own minute-ticking clock exists for its hour/minute
  // seeding, which a task doesn't need.
  const today = useToday();

  // Fires once (guarded by dueDay === null), then never overwrites the
  // user's own pick — same "adjust state during render" pattern EventForm
  // uses for its start/end seed, for the same reason (a plain
  // useEffect+setState trips this repo's lint rule; see EventForm.tsx's
  // subscribeToClock comment).
  if (!isEdit && dueDay === null && today !== null) {
    setDueDay(initialDateISO ? parseLocalDateString(initialDateISO) : today);
  }

  function togglePerson(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!dueDay) return;
    if (!title.trim()) return setError("Give the task a title.");
    if (selectedUserIds.length === 0) return setError("Add at least one person.");

    const input: TaskInput = {
      title: title.trim(),
      details: details.trim() || null,
      dueDate: localDayToAllDayInstant(dueDay),
      userIds: selectedUserIds,
    };

    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateTask(defaultValues.id, input)
        : await createTask(input);
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

      <Field label="Details" hint="Optional">
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-xl bg-surface-2 px-4 py-3 text-base outline-none"
        />
      </Field>

      <EventPeopleField people={people} selectedUserIds={selectedUserIds} onToggle={togglePerson} />

      <Field label="Due date">
        <input
          type="date"
          value={dueDay ? toDateInputValue(dueDay) : ""}
          onChange={(e) => {
            if (!e.target.value) return;
            setDueDay(parseLocalDateString(e.target.value));
          }}
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
        />
      </Field>

      <div
        aria-disabled="true"
        className="flex min-h-12 items-center gap-3 rounded-xl bg-surface-2 px-4 text-muted"
      >
        <Repeat aria-hidden="true" size={18} />
        <span className="text-base font-medium">Does not repeat</span>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !dueDay}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Saving…" : isEdit ? "Save changes" : "Add task"}
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
