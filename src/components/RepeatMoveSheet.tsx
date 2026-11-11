"use client";

import { useEffect } from "react";
import type { RepeatSheetProps } from "@/lib/useEventMoves";

/**
 * Mission 71: what a drop of a repeating event asks. The block stays where it
 * was dropped behind the dim (useEventMoves.ts keeps its lifted look). "This
 * one" is the plain move, "All of them" shifts the whole series in Google,
 * Cancel and the dim put the block back. On another day only "This one" is
 * offered, with the line saying why. A house sheet like ConfirmSheet, but
 * never danger-coloured: nothing here deletes.
 */
export function RepeatMoveSheet({ title, where, sameDay, onThisOne, onAll, onCancel }: RepeatSheetProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-black/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Move a repeating event"
        className="relative flex w-full flex-col rounded-t-2xl bg-surface p-4 shadow-lg transition duration-200 starting:translate-y-8 starting:opacity-0 md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <h2 className="mb-1 text-lg font-semibold">Move a repeating event</h2>
        <p className="mb-4 text-sm text-muted">{`${title}, to ${where}.`}</p>
        {!sameDay && (
          <p className="mb-4 rounded-xl bg-bg px-3 py-2.5 text-sm text-muted">
            Only this one can move to another day. To move every {title}, drop it on the same day at the new time.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onThisOne}
            className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
          >
            This one
          </button>
          {sameDay && (
            <button
              type="button"
              onClick={onAll}
              className="min-h-12 w-full rounded-xl border border-line text-base font-semibold transition-colors active:bg-surface-2"
            >
              All of them
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 w-full rounded-xl text-base font-semibold text-muted transition-colors active:bg-surface-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
