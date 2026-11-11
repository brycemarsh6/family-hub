"use client";

import { useEffect, useRef } from "react";

/** How long a bar stays before it leaves on its own. */
export const UNDO_BAR_MS = 5000;

/**
 * A short line at the bottom of the screen after a change (mission 70: the
 * Calendar's "Moved to Wed 2:15 PM" with Undo), shared so other undoable
 * changes (PR 8's tasks) use the same bar.
 *
 * `tone="neutral"` is the dark pill with an optional action on the right,
 * announced politely (`role="status"`). `tone="warn"` is a refusal or failed
 * save: warn colours, never danger (DESIGN.md "Error color"), announced at
 * once (`role="alert"`). Either leaves after 5 seconds by calling `onClose`.
 *
 * It sits bottom right, just left of a round + (FloatingAddButton's 3.5rem
 * button 1rem in from the edge, plus a 1rem gap), so it never covers it, and
 * above the safe area. Give it a fresh `key` per message: a new one replaces
 * the old and its 5 seconds start again. The slide in is a `starting:`
 * transition, which globals.css makes instant under reduce motion.
 */
export function UndoBar({
  message,
  tone = "neutral",
  actionLabel,
  onAction,
  onClose,
}: {
  message: string;
  tone?: "neutral" | "warn";
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}) {
  // The latest onClose, so a parent re-render does not restart the 5 seconds.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => close.current(), UNDO_BAR_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const warn = tone === "warn";
  return (
    <div
      className="pointer-events-none fixed right-0 left-[var(--app-nav-width,0px)] z-40 flex justify-end pr-[5.5rem] pl-4"
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
    >
      <div
        role={warn ? "alert" : "status"}
        className={`pointer-events-auto flex min-h-12 w-full max-w-md items-center gap-2 rounded-xl pl-4 text-sm shadow-lg transition duration-200 starting:translate-y-2 starting:opacity-0 ${
          warn ? "border border-warn bg-warn-soft pr-4 text-warn" : "bg-fg pr-1 text-bg"
        }`}
      >
        <span className="flex-1 py-2 leading-snug">{message}</span>
        {actionLabel && onAction && !warn && (
          <button
            type="button"
            onClick={onAction}
            className="min-h-12 min-w-16 rounded-lg px-3 font-bold underline underline-offset-2 active:opacity-70"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
