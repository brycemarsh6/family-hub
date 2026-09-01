"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

/**
 * A bottom sheet holding a short list of mutually-exclusive choices, each a
 * full-width row with a checkmark on the selected one. The house pattern for
 * "pick one of a few things" — used for the Recipes page's Cookbooks/All
 * Recipes view toggle and the cookbook list's A–Z/most-recent sort, and
 * meant to be reused anywhere else a small radio-style choice comes up
 * rather than a native <select> or a custom dropdown.
 *
 * `leading` (optional, per-option) renders before the label — added for
 * Family Accounts' avatar-colour picker, where each row needs a small
 * color swatch inline. Every existing caller omits it and is unaffected.
 */
export function RadioSheet<T extends string>({
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  title: string;
  options: { value: T; label: string; leading?: React.ReactNode }[];
  selected: T;
  onSelect: (value: T) => void;
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
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
              className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                {option.leading}
                <span className="min-w-0 truncate">{option.label}</span>
              </span>
              {selected === option.value && (
                <Check aria-hidden="true" size={18} className="text-accent" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
