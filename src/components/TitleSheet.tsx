"use client";

import { useEffect, useState } from "react";

/**
 * A bottom sheet holding exactly one text field — "name this thing" — used
 * for both creating a cookbook (title → straight into the new empty book,
 * never a second confirmation step) and renaming one.
 */
export function TitleSheet({
  heading,
  initialValue = "",
  placeholder,
  label = "Title",
  hint,
  maxLength,
  submitLabel,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  heading: string;
  initialValue?: string;
  placeholder?: string;
  /** The field's label (default "Title"). */
  label?: string;
  /** One muted line under the field. */
  hint?: string;
  maxLength?: number;
  submitLabel: string;
  pending?: boolean;
  error?: string | null;
  onSubmit: (title: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initialValue);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

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
        aria-label={heading}
        className="relative flex w-full flex-col rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <label className={`block text-sm text-muted ${hint ? "mb-1" : "mb-4"}`}>
          <span className="mb-1 block">{label}</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
            placeholder={placeholder}
            maxLength={maxLength}
            autoComplete="off"
            autoFocus
            className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
          />
        </label>

        {hint && <p className="mb-4 text-sm text-muted">{hint}</p>}

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !title.trim()}
          className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
