"use client";

import { useEffect } from "react";

/**
 * A one-line "not built yet" acknowledgment for a control that's visible on
 * purpose (per the house's no-feature-stubbed-early rule) but not wired up
 * yet. A real tap gets a real response instead of silently doing nothing.
 *
 * Currently just the Nutrition button (real in C6). The Meal Plan and
 * Groceries action circles used this too until C5 wired them up — which is
 * the intended lifecycle for anything pointed here.
 */
export function ComingSoonSheet({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
        aria-label={title}
        className="relative flex w-full flex-col rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <h2 className="mb-1 text-lg font-semibold">{title}</h2>
        <p className="mb-4 text-sm text-muted">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
