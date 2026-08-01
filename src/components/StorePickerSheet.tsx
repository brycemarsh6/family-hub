"use client";

import { useEffect } from "react";
import { STORES, STORE_ICON as StoreIcon, type Store } from "@/lib/constants";

/**
 * "Which store is this for?" — opened by Inventory's cart button (single
 * item) and its "Add N low items" button (whole batch at once). Same sheet
 * either way; the caller decides what happens with the answer.
 *
 * Skipping (the × button, the backdrop, or Escape) still adds the item —
 * it just leaves the store unassigned. The button that opened this sheet
 * already means "add to the list"; the store is a secondary question, so
 * backing out of it shouldn't silently cancel the thing the user actually
 * asked for. That's why `onSkip` is a real action here, not a no-op close.
 */
export function StorePickerSheet({
  title,
  onChoose,
  onSkip,
}: {
  title: string;
  onChoose: (store: Store) => void;
  onSkip: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSkip]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Skip choosing a store"
        onClick={onSkip}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip choosing a store"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {STORES.map((store) => (
            <button
              key={store}
              type="button"
              onClick={() => onChoose(store)}
              className="flex min-h-14 items-center gap-3 rounded-xl bg-surface-2 px-4 text-left text-base font-medium transition-colors active:opacity-80"
            >
              <StoreIcon aria-hidden="true" size={20} className="text-muted" />
              {store}
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 w-full rounded-xl text-sm font-medium text-muted transition-colors hover:bg-surface-2"
          >
            Skip — decide later
          </button>
        </div>
      </div>
    </div>
  );
}
