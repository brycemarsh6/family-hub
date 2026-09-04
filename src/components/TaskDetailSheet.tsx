"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronLeft, MoreVertical, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { TaskEditView } from "./TaskEditView";
import { completeTask, deleteTask, uncompleteTask } from "@/app/actions/tasks";
import { allDayInstantToLocalDay } from "@/lib/calendarDates";
import { formatDayLabel } from "@/lib/mealPlanDates";
import type { CalendarPersonView, CalendarTaskView } from "@/lib/types";

/**
 * The house bottom sheet for one task, opened by tapping its card
 * (mission-14/C4 — DaySection/TaskCard's `onOpenTask` was wired to a no-op
 * by C3, this is what makes it real). Same `view` state-machine shape as
 * EventDetailSheet (main / menu), plus a third `edit` view — deliberately
 * its OWN component (TaskEditView.tsx, mission-14/C5) rather than a branch
 * inside this one, since a task's fields and verbs genuinely differ
 * (TaskCard.tsx's own comment already makes this call for the card; the
 * same reasoning extends to the sheet).
 *
 * Edit is INLINE here, not a route push the way EventDetailSheet's Edit
 * button navigates to `/calendar/[id]/edit`. That's a boundary
 * consequence, not a style preference: C4's may-touch list had no
 * `src/app/` route, so there was nowhere to navigate Edit to. C5 closed
 * the other half of that gap instead — the full household roster now
 * flows page.tsx → CalendarViews.tsx → here → TaskEditView, so People is a
 * real reassignable picker (EventPeopleField, the same one TaskForm.tsx
 * uses), not a static echo of who's currently on the task.
 */
export function TaskDetailSheet({
  task,
  people,
  canManage,
  onClose,
  onChanged,
  onDeleted,
}: {
  /** `task.isMine` (per D3, computed server-side in page.tsx) is what
   * `canComplete` below reads — a per-task boolean, never a role or user
   * object, that decides ONLY whether a control that would be refused
   * server-side is drawn at all. `completeTask`'s own membership guard
   * (actions/tasks.ts) is the real gate, reached independently of it
   * every time. */
  task: CalendarTaskView;
  /** The full household roster — page.tsx's parallel `db.user.findMany`
   * (mission-14/C5), threaded straight through to TaskEditView's people
   * picker. Unused outside the "edit" view. */
  people: CalendarPersonView[];
  canManage: boolean;
  onClose: () => void;
  /** Called after a successful mark-complete/uncomplete/edit — the parent
   * refreshes the page's own data (there's no client-side task list to
   * splice locally, same reasoning as EventDetailSheet's onDeleted). Sheet
   * stays open; local state below already reflects the change. */
  onChanged: () => void;
  /** Called after a successful delete — the parent closes this sheet AND
   * refreshes, same split EventDetailSheet's onDeleted/onClose make. */
  onDeleted: () => void;
}) {
  const [view, setView] = useState<"main" | "menu" | "edit">("main");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Local echo of the task, updated optimistically after each successful
  // action — `task` itself is a snapshot the parent captured when the
  // sheet was opened (CalendarViews.tsx's `selectedTask` state), and
  // won't pick up page.tsx's freshly-refetched array on its own the way a
  // remounted component would. Same shape as TaskForm's `isEdit` pattern:
  // starts from the prop, then only ever moves in response to a
  // confirmed server write, never guessed.
  const [current, setCurrent] = useState(task);

  useEffect(() => {
    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key !== "Escape") return;
      if (view !== "main") setView("main");
      else onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, view]);

  const completed = current.completedAt !== null;
  // Per the permission model (D3, actions/tasks.ts's own header comment):
  // a manager can complete anything; anyone else only a task they're
  // genuinely a person on. Un-complete is manager-only, full stop — a kid
  // gets "complete only," never able to undo their own or a parent's
  // completion. Both booleans decide only what's DRAWN; the actions'
  // own guards (MANAGER_ROLES / assertCanCompleteTask) are the real gate.
  const canComplete = canManage || current.isMine;
  const canUncomplete = canManage;

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const result = await completeTask(current.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrent((prev) => ({ ...prev, completedAt: new Date() }));
      onChanged();
    });
  }

  function handleUncomplete() {
    setError(null);
    startTransition(async () => {
      const result = await uncompleteTask(current.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrent((prev) => ({ ...prev, completedAt: null }));
      onChanged();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTask(current.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  const dueLabel = formatDayLabel(allDayInstantToLocalDay(current.dueDate));

  const headerText = view === "edit" ? "Edit task" : current.title;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={current.title}
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          {view === "main" ? (
            <h2 className="min-w-0 break-words text-lg font-semibold">{headerText}</h2>
          ) : (
            <button
              type="button"
              onClick={() => setView("main")}
              className="-ml-1 flex min-h-11 items-center gap-1 text-lg font-semibold"
            >
              <ChevronLeft aria-hidden="true" size={20} />
              {headerText}
            </button>
          )}
          <div className="flex shrink-0 items-center gap-1">
            {view === "main" && canManage && (
              <button
                type="button"
                onClick={() => setView("menu")}
                aria-label="More actions"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2"
              >
                <MoreVertical aria-hidden="true" size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
            >
              ×
            </button>
          </div>
        </div>

        {view === "menu" ? (
          <div className="flex flex-col gap-4">
            {error && (
              <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-danger transition-colors active:bg-surface-2 disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" size={18} />
              {pending ? "Deleting…" : "Delete"}
            </button>
          </div>
        ) : view === "edit" ? (
          <TaskEditView
            task={current}
            people={people}
            onSaved={(updated) => {
              setCurrent((prev) => ({ ...prev, ...updated }));
              setView("main");
              onChanged();
            }}
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">Due {dueLabel}</p>

            {current.people.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {current.people.map((person) => (
                  <span
                    key={person.userId}
                    className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3"
                  >
                    <AvatarBadge
                      displayName={person.displayName}
                      avatarColor={person.avatarColor}
                      size={28}
                    />
                    <span className="text-sm font-medium">{person.displayName}</span>
                  </span>
                ))}
              </div>
            )}

            {current.details && (
              <p className="mb-4 whitespace-pre-wrap text-sm text-muted">{current.details}</p>
            )}

            {error && (
              <p role="alert" className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {!completed && canComplete && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={pending}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
                >
                  <Check aria-hidden="true" size={18} />
                  {pending ? "Saving…" : "Mark complete"}
                </button>
              )}

              {completed && canUncomplete && (
                <button
                  type="button"
                  onClick={handleUncomplete}
                  disabled={pending}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-base font-semibold text-fg transition-opacity active:opacity-80 disabled:opacity-50"
                >
                  <RotateCcw aria-hidden="true" size={18} />
                  {pending ? "Saving…" : "Mark not complete"}
                </button>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("edit");
                  }}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-base font-semibold text-fg transition-opacity active:opacity-80"
                >
                  <Pencil aria-hidden="true" size={18} />
                  Edit
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
