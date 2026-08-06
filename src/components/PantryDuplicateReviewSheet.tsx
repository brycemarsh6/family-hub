"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { QuantityStepper } from "./QuantityStepper";
import { CATEGORIES, LOCATIONS } from "@/lib/constants";
import type { DuplicateMatch } from "@/lib/duplicates";

/** What was typed into the add bar, captured before creation so the sheet
 * can show it back for editing without anything having been written yet. */
export type PendingPantryAdd = {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  location: string;
  matches: DuplicateMatch[];
};

export type PantryCreateFields = {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  location: string;
};

/**
 * The add-time twin of PutAwayReviewSheet — same visual shape, one screen
 * instead of a step-through, because there's only ever one pending item
 * here. Opens only when checkForDuplicateOnAdd found something; a name
 * with no plausible match never reaches this at all (see PantryAddFlow).
 */
export function PantryDuplicateReviewSheet({
  pending,
  submitting,
  onCancel,
  onCreateNew,
  onMerge,
}: {
  pending: PendingPantryAdd;
  submitting: boolean;
  onCancel: () => void;
  onCreateNew: (fields: PantryCreateFields) => void;
  onMerge: (pantryItemId: string, quantity: number) => void;
}) {
  // Pre-select the same-location exact match, if there is one — the
  // "you probably meant to just add more" case. Anything else (a
  // different-location exact match, or only fuzzy suggestions) starts
  // unselected: the household legitimately keeps some things in two
  // places, so "create separately" — what was actually typed and
  // chosen — is the safer default there, not a match this screen picks
  // on its own.
  const sameLocationMatch = pending.matches.find(
    (m) => m.kind === "exact-same-location",
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    sameLocationMatch?.item.id ?? null,
  );

  const [name, setName] = useState(pending.name);
  const [quantity, setQuantity] = useState(pending.quantity);
  const [unit, setUnit] = useState(pending.unit ?? "");
  const [category, setCategory] = useState(pending.category);
  const [location, setLocation] = useState(pending.location);

  const selected = pending.matches.find((m) => m.item.id === selectedId);

  function handleConfirm() {
    if (selected) {
      onMerge(selected.item.id, quantity);
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreateNew({
      name: trimmed,
      quantity,
      unit: unit.trim() || null,
      category,
      location,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Cancel — nothing will be added"
        onClick={onCancel}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Already in the inventory?"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Already in the inventory?</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel — nothing will be added"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {pending.matches.map((match) => {
              const picked = match.item.id === selectedId;
              return (
                <button
                  key={match.item.id}
                  type="button"
                  onClick={() => setSelectedId(picked ? null : match.item.id)}
                  aria-pressed={picked}
                  className={`flex min-h-14 flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    picked
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line bg-surface-2 active:bg-line"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <BookOpen aria-hidden="true" size={14} className="shrink-0" />
                    {match.item.name}
                  </span>
                  <span className="text-xs text-muted">
                    {match.item.quantity}
                    {match.item.unit ? ` ${match.item.unit}` : ""} ·{" "}
                    {match.item.location}
                    {match.kind === "exact-same-location" && " · same spot"}
                    {match.kind === "exact-other-location" && " · different spot"}
                  </span>
                </button>
              );
            })}
          </div>

          {selected ? (
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <p className="text-sm">
                Adding to <span className="font-semibold">{selected.item.name}</span>{" "}
                instead of creating a new item.
              </p>
              <div className="mt-3">
                <Field label="How many to add">
                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    min={1}
                    label={selected.item.name}
                  />
                </Field>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || (!selected && !name.trim())}
            className="mt-2 min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-40"
          >
            {submitting ? "Adding…" : selected ? "Add to existing item" : "Add as new item"}
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
