"use client";

import { useEffect, useState } from "react";
import { QuantityStepper } from "./QuantityStepper";
import { CATEGORIES, STORES } from "@/lib/constants";
import type { GroceryItemView } from "@/lib/types";

export type GroceryItemEdits = {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  store: string | null;
};

/**
 * The "fix this list entry" panel — same bottom-sheet-on-phones /
 * centered-dialog-on-desktop shape as PantryItemEditSheet, and reached the
 * same way its Delete twin is: by swiping the row. Tapping a shopping row
 * is already spoken for (it ticks the item off, which has to stay the
 * fastest action on the page), so editing can't live on the tap.
 *
 * Fewer fields than the pantry version, because a grocery item genuinely
 * has fewer: no location, no low-stock threshold, no expiry — those all
 * describe something already in the house. What it has instead is a store.
 */
export function GroceryItemEditSheet({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: GroceryItemView;
  onClose: () => void;
  onSave: (edits: GroceryItemEdits) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [unit, setUnit] = useState(item.unit ?? "");
  const [category, setCategory] = useState(item.category);
  // "" stands for "no store chosen", which is a normal state — an item can
  // sit on the list before anyone decides where it's being bought.
  const [store, setStore] = useState(item.store ?? "");

  // Close on Escape, same as tapping the backdrop or the × button.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    onSave({
      name: trimmedName,
      quantity,
      unit: unit.trim() || null,
      category,
      store: store || null,
    });
  }

  return (
    // z-[60] clears both the sticky header and the bottom tab bar, so the
    // sheet is always on top regardless of scroll position.
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      {/* Backdrop — tapping it discards any unsaved changes, same as the ×. */}
      <button
        type="button"
        aria-label="Close without saving"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${item.name}`}
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit item</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close without saving"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
            />
          </Field>

          <div className="flex items-end gap-3">
            <Field label="Quantity" className="shrink-0">
              {/* min 1, not 0: taking a grocery item down to nothing is what
                  Delete is for — the same floor the row's own stepper and
                  the server action both use. */}
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                min={1}
                label={name || "quantity"}
              />
            </Field>
            <Field label="Unit" className="min-w-0 flex-1">
              <input
                type="text"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="bunch, lbs, cans…"
                autoComplete="off"
                className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
              />
            </Field>
          </div>

          <Field label="Category">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
            >
              {CATEGORIES.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Store">
            <select
              value={store}
              onChange={(event) => setStore(event.target.value)}
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
            >
              {/* Blank is a real choice, not a prompt to pick something —
                  it's how the item looks under the "Unassigned" chip. */}
              <option value="">No store yet</option>
              {STORES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={handleSave}
            className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-11 w-full rounded-xl text-sm font-medium text-danger transition-colors hover:bg-surface-2"
          >
            Delete item
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm text-muted ${className ?? ""}`}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
