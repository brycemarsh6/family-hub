"use client";

import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { FORM_SAVE_WIDE_CLASSES } from "@/lib/gridClasses";
import { archiveHabit, deleteHabit, restoreHabit, type HabitActionResult } from "@/app/actions/habits";

const BUTTON_PLAIN =
  "flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-fg disabled:opacity-40";

/**
 * The Edit-only block under Save in HabitForm: Archive (or Restore) and
 * Delete. `run` is the form's own runner, so errors and the return to
 * /habits/manage behave the same as Save. Rendered as a fragment, so its
 * buttons stack in the form's column.
 */
export function HabitEditActions({
  initial,
  pending,
  run,
}: {
  initial: { id: string; archived: boolean };
  pending: boolean;
  run: (action: () => Promise<HabitActionResult>) => void;
}) {
  return (
    <>
      <hr className="border-line" />
      {initial.archived ? (
        <button type="button" disabled={pending} onClick={() => run(() => restoreHabit(initial.id))} className={`${BUTTON_PLAIN} ${FORM_SAVE_WIDE_CLASSES}`}>
          <RotateCcw aria-hidden="true" size={16} />
          Restore
        </button>
      ) : (
        <>
          <button type="button" disabled={pending} onClick={() => run(() => archiveHabit(initial.id))} className={`${BUTTON_PLAIN} ${FORM_SAVE_WIDE_CLASSES}`}>
            <Archive aria-hidden="true" size={16} />
            Archive
          </button>
          <span className="text-center text-[0.8125rem] text-muted">Archive keeps its history and can be brought back.</span>
        </>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => deleteHabit(initial.id))}
        className={`flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-danger px-4 text-sm font-semibold text-danger disabled:opacity-40 ${FORM_SAVE_WIDE_CLASSES}`}
      >
        <Trash2 aria-hidden="true" size={16} />
        Delete
      </button>
    </>
  );
}
