"use client";

import { useEffect, useState } from "react";
import { QuantityStepper } from "./QuantityStepper";
import { CATEGORIES, LOCATIONS } from "@/lib/constants";
import type { PantryItemView } from "@/lib/types";

export type PantryItemEdits = {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  location: string;
  lowThreshold: number;
};

/**
 * The full "edit this item" panel: every field a pantry item has, plus
 * delete. Opens as a sheet from the bottom on phones, and as a centered
 * dialog on wider screens — either way it takes over the screen on purpose,
 * since this is a deliberate, occasional edit rather than the quick
 * day-to-day quantity nudge (which stays on the row itself, untouched).
 */
export function PantryItemEditSheet({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: PantryItemView;
  onClose: () => void;
  onSave: (edits: PantryItemEdits) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [unit, setUnit] = useState(item.unit ?? "");
  const [category, setCategory] = useState(item.category);
  const [location, setLocation] = useState(item.location);
  const [lowThreshold, setLowThreshold] = useState(item.lowThreshold);

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
      location,
      lowThreshold,
    });
  }

  return (
    // z-[60] clears both the sticky header and the bottom tab bar (both z-40/50),
    // so the sheet is always on top regardless of scroll position.
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
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                min={0}
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

          <Field label="Location">
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
            >
              {LOCATIONS.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Mark as low when at or below">
            <QuantityStepper
              value={lowThreshold}
              // The unit shown here tracks whatever's currently typed above,
              // so switching Unit updates this label immediately too.
              unit={unit.trim() || null}
              onChange={setLowThreshold}
              min={0}
              label="low-stock threshold"
            />
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
