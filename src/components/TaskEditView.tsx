"use client";

import { useState, useTransition } from "react";
import { updateTask, type TaskInput } from "@/app/actions/tasks";
import { allDayInstantToLocalDay, localDayToAllDayInstant } from "@/lib/calendarDates";
import { EventPeopleField } from "./EventPeopleField";
import type { CalendarPersonView, CalendarTaskView } from "@/lib/types";

/** Local "YYYY-MM-DD" for the native date input, and its inverse — the same
 * per-file copy TaskDetailSheet.tsx keeps (see that file's own header
 * comment for why: EventDateTimeFields.tsx's `parseLocalDateString` already
 * has two consumers, TaskForm.tsx and EventForm.tsx, and Captain's CT1 trip
 * condition is that a THIRD consumer — or any consumer outside
 * `src/components/` — makes moving it to `src/lib/` mandatory. This
 * extraction (mission-14/C5) doesn't create one: it moves the copy from one
 * `src/components/` file to another. */
function toDateInputValue(date: Date): string {
  const [y, m, d] = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function parseDateInputValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * TaskDetailSheet's "edit" view, extracted (mission-14/C5) for two reasons
 * at once, sharing one seam: TaskDetailSheet.tsx had grown to 418 lines
 * (STRUCTURE.md's 350-line soft cap), and this is also exactly where the
 * "people are shown but not reassignable" gap C4 flagged has to close —
 * both live in the same view.
 *
 * People are now a real `EventPeopleField` picker over the full household
 * roster, not a static echo of the task's current people — TaskForm.tsx
 * already establishes this exact combination (EventPeopleField +
 * `updateTask`'s `userIds`), reused here rather than rebuilt.
 *
 * Owns its own form state and its own `updateTask` call — same shape as
 * TaskForm, and deliberately independent of TaskDetailSheet's `pending`/
 * `error` (which still cover Complete/Uncomplete/Delete in the sheet's
 * other views). `onSaved` hands back the exact fields that changed, plus
 * the resolved `CalendarPersonView[]` for the newly-selected people (this
 * component has the full roster in hand; the sheet does not), so the
 * parent can update its own optimistic `current` without a re-fetch.
 */
export function TaskEditView({
  task,
  people,
  onSaved,
}: {
  task: CalendarTaskView;
  /** The full household roster (id/displayName/avatarColor, kids
   * included) — page.tsx's new third `Promise.all` query, threaded down
   * through CalendarViews.tsx and TaskDetailSheet unchanged. */
  people: CalendarPersonView[];
  onSaved: (updated: {
    title: string;
    details: string | null;
    dueDate: Date;
    people: CalendarPersonView[];
  }) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [details, setDetails] = useState(task.details ?? "");
  const [dueDay, setDueDay] = useState(() => allDayInstantToLocalDay(task.dueDate));
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    task.people.map((person) => person.userId),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function togglePerson(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!title.trim()) {
      setError("Give the task a title.");
      return;
    }
    if (selectedUserIds.length === 0) {
      setError("Add at least one person.");
      return;
    }

    const input: TaskInput = {
      title: title.trim(),
      details: details.trim() || null,
      dueDate: localDayToAllDayInstant(dueDay),
      userIds: selectedUserIds,
    };

    setError(null);
    startTransition(async () => {
      const result = await updateTask(task.id, input);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved({
        title: input.title,
        details: input.details ?? null,
        dueDate: input.dueDate,
        people: people.filter((person) => selectedUserIds.includes(person.userId)),
      });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block text-sm text-muted">
        <span className="mb-1 block">Title</span>
        <input
          type="text"
          value={title}
          onChange={(inputEvent) => setTitle(inputEvent.target.value)}
          autoComplete="off"
          autoFocus
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base text-fg outline-none"
        />
      </label>

      <label className="block text-sm text-muted">
        <span className="mb-1 flex items-baseline justify-between">
          <span>Details</span>
          <span className="text-xs">Optional</span>
        </span>
        <textarea
          value={details}
          onChange={(inputEvent) => setDetails(inputEvent.target.value)}
          rows={3}
          className="w-full resize-y rounded-xl bg-surface-2 px-4 py-3 text-base text-fg outline-none"
        />
      </label>

      <EventPeopleField
        people={people}
        selectedUserIds={selectedUserIds}
        onToggle={togglePerson}
      />

      <label className="block text-sm text-muted">
        <span className="mb-1 block">Due date</span>
        <input
          type="date"
          value={toDateInputValue(dueDay)}
          onChange={(inputEvent) => {
            if (!inputEvent.target.value) return;
            setDueDay(parseDateInputValue(inputEvent.target.value));
          }}
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base text-fg outline-none"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
