"use client";

import { useRef, useState, useTransition } from "react";
import { QuantityStepper } from "./QuantityStepper";

/**
 * The floating "add something" bar pinned near the bottom of the screen.
 *
 * Collapsed it's just a text box and an Add button — the fast path, which is
 * what you want when you're standing at the fridge. Start typing and it grows
 * to reveal quantity and whichever extra choices the page passes in as
 * `children` (category for groceries, category + location for the pantry).
 */
export function AddItemBar({
  action,
  placeholder,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  placeholder: string;
  /** Extra <select> fields shown once the bar is expanded. */
  children?: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    startTransition(async () => {
      await action(formData);
    });

    // Clear the box and keep the keyboard up, so several items can be added
    // one after another without reaching for anything.
    formRef.current?.reset();
    setQuantity(1);
    inputRef.current?.focus();
  }

  return (
    <div
      // 4rem clears the fixed tab bar, which now sits along the bottom at every
      // screen size — so this offset applies at every size too.
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-4"
    >
      <form
        ref={formRef}
        action={handleSubmit}
        onFocus={() => setExpanded(true)}
        onBlur={(event) => {
          // Collapse only when focus leaves the bar entirely and nothing's typed.
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          if (!inputRef.current?.value) setExpanded(false);
        }}
        className="mx-auto flex max-w-3xl flex-col gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg shadow-black/5"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            name="name"
            type="text"
            placeholder={placeholder}
            autoComplete="off"
            aria-label={placeholder}
            className="min-h-12 min-w-0 flex-1 rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={isPending}
            className="min-h-12 shrink-0 rounded-xl bg-accent px-5 text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {expanded && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              label="quantity"
              size="sm"
            />
            {/* The number lives in React state so the stepper can drive it; this
                hidden field is how it reaches the server with the form. */}
            <input type="hidden" name="quantity" value={quantity} />
            {children}
          </div>
        )}
      </form>
    </div>
  );
}

/** A touch-sized dropdown, styled to match the rest of the bar. */
export function AddItemSelect({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue: string;
}) {
  return (
    <select
      name={name}
      aria-label={label}
      defaultValue={defaultValue}
      className="min-h-10 min-w-0 flex-1 rounded-lg bg-surface-2 px-2 text-sm outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
