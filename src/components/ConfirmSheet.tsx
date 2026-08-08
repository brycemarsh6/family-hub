"use client";

import { useEffect } from "react";

/**
 * A confirm-with-reassurance dialog — deliberately NOT the house's normal
 * single-tap-no-confirmation delete pattern. Reserved for the two places in
 * the Recipes v2 plan that break that rule on purpose (deleting a cookbook,
 * deleting a tag): both silently touch many rows' relationships at once,
 * unlike deleting one grocery item, so the message states a real count
 * rather than just asking "are you sure?".
 */
export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
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

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="min-h-12 w-full rounded-xl bg-danger text-base font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-50"
          >
            {pending ? "Working…" : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 w-full rounded-xl text-sm font-medium text-muted transition-colors hover:bg-surface-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
