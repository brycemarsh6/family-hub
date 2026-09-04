import { AvatarBadge } from "./AvatarBadge";
import type { CalendarTaskView } from "@/lib/types";

/**
 * One Task, rendered on the single calendar day it's due (mission-14/C3,
 * the first place CalendarTaskView actually renders — C2 only threaded the
 * prop through). A task has exactly one due date, never a span, so unlike
 * EventCard this needs no `day` argument to decide which day's badge to
 * show.
 *
 * Deliberately its OWN component rather than a task variant of EventCard.
 * EventCard's whole shape exists to describe a start/end SPAN — the
 * all-day/multi-day badge math (`formatAllDayLabel`/`formatTimeRange`,
 * "Day N of M"), `showLocation`, `compact` line-clamping for a week's worth
 * of agenda rows — none of which a task has anything to say about. Bolting
 * a checkbox + completed state onto that shape would mean threading a
 * `completedAt` discriminant through every one of EventCard's existing
 * branches for a case that shares none of them. Same "fields and verbs
 * genuinely differ" reasoning mission-14's C4 boundary already gives for
 * TaskDetailSheet vs EventDetailSheet.
 *
 * A real `<button>`, same shape as EventCard's — mission-14/C3 is rendering
 * only (no detail sheet, no mark-complete control; that's C4), so `onOpen`
 * is currently wired to a no-op by the caller. This is still the real tap
 * target C4 attaches its sheet to, not a placeholder markup shape that gets
 * rebuilt later.
 *
 * No "overdue" treatment: only `completedAt` changes how this renders. A
 * task whose due date has already passed but isn't complete still renders
 * exactly like an open task due today or tomorrow — neither the plan nor
 * mission-14's brief asks for a third visual state here, so one wasn't
 * invented.
 */
export function TaskCard({
  task,
  onOpen,
}: {
  task: CalendarTaskView;
  onOpen: () => void;
}) {
  const completed = task.completedAt !== null;

  return (
    <button
      type="button"
      onClick={onOpen}
      // aria-label carries the completed state for assistive tech —
      // `line-through` is a purely visual CSS text-decoration and screen
      // readers don't announce it, so "done" has to be said in words
      // somewhere. The visible title text is still there for sighted
      // readers; aria-label replaces (not duplicates) the accessible name.
      aria-label={completed ? `${task.title}, completed` : task.title}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line p-3 text-left"
    >
      {/* Display-only checkbox affordance — mark-complete is C4's job
          (TaskDetailSheet). Same square-glyph vocabulary GroceryRow.tsx
          already uses for a checked item: filled + a checkmark when done,
          an empty outline otherwise. aria-hidden since the state is already
          in the button's own aria-label above. */}
      <span
        aria-hidden="true"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ${
          completed ? "border-accent bg-accent text-accent-fg" : "border-line"
        }`}
      >
        {completed ? "✓" : ""}
      </span>

      <div className="min-w-0 flex-1">
        {/* line-through here joins GroceryRow.tsx's existing vocabulary for
            "struck off a list" — see EventCard.tsx's corrected comment for
            why that's the same claim a checked grocery item makes, and why
            it must NOT be confused with an event's past-state dimming
            (already happened is not done): a completed task is muted AND
            struck through; a past event is muted but never struck
            through. */}
        <p
          className={`break-words text-base ${
            completed ? "font-medium text-muted line-through" : "font-semibold text-fg"
          }`}
        >
          {task.title}
        </p>
      </div>

      {task.people.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {task.people.map((person) => (
            <AvatarBadge
              key={person.userId}
              displayName={person.displayName}
              avatarColor={person.avatarColor}
              size={28}
            />
          ))}
        </div>
      )}
    </button>
  );
}
