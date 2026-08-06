"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { QuantityStepper } from "./QuantityStepper";
import { CATEGORIES, LOCATIONS } from "@/lib/constants";
import type {
  PutAwayDecision,
  PutAwayNewItem,
} from "@/app/actions/groceries";

/**
 * Steps through the checked items that don't already exist in the
 * inventory — one at a time, budgeting-app-review style, since that's
 * exactly what Bryce asked for: a small, minimal screen per item rather
 * than one long form. Items the app already knows about (linked, or an
 * exact name match) never reach this sheet at all — see PutAwayButton,
 * which only opens this when classifyForPutAway found something new.
 *
 * Nothing here writes to the database. The whole review collects
 * decisions locally and hands them to onSubmit only once, after the last
 * item — so closing this sheet at any point (the × or the backdrop)
 * discards everything and the shopping list is untouched, exactly as if
 * "Put away" had never been tapped.
 */
export function PutAwayReviewSheet({
  newItems,
  submitting,
  onCancel,
  onSubmit,
}: {
  newItems: PutAwayNewItem[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (decisions: PutAwayDecision[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [collected, setCollected] = useState<PutAwayDecision[]>([]);

  const current = newItems[index];
  const isLast = index === newItems.length - 1;

  function handleItemDone(decision: PutAwayDecision) {
    const next = [...collected, decision];
    if (isLast) {
      onSubmit(next);
    } else {
      setCollected(next);
      setIndex(index + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Cancel — nothing will be put away"
        onClick={onCancel}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`New to the inventory — ${index + 1} of ${newItems.length}`}
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">New to the inventory</h2>
            <p className="text-sm text-muted">
              {index + 1} of {newItems.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel — nothing will be put away"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        {/* Keyed by the item, not the index — swapping items is a real
            identity change (the user is now looking at a different
            grocery row), and remounting fresh is simpler and safer than
            trying to reset a dozen pieces of local state by hand every
            time `current` changes underneath the same component. */}
        <ReviewItemForm
          key={current.groceryItemId}
          item={current}
          isLast={isLast}
          submitting={submitting}
          onDone={handleItemDone}
        />
      </div>
    </div>
  );
}

function ReviewItemForm({
  item,
  isLast,
  submitting,
  onDone,
}: {
  item: PutAwayNewItem;
  isLast: boolean;
  submitting: boolean;
  onDone: (decision: PutAwayDecision) => void;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [unit, setUnit] = useState(item.unit ?? "");
  const [category, setCategory] = useState(item.category);
  const [location, setLocation] = useState(item.location);
  // Which suggestion (if any) the human confirmed is the same item. Once
  // set, the create-fields below step aside for a plain "merging into ___"
  // notice — editing name/category/location for something that already
  // exists would be editing the wrong row.
  const [mergeId, setMergeId] = useState<string | null>(null);
  const mergedSuggestion = item.suggestions.find((s) => s.pantryItemId === mergeId);

  function handleSubmit() {
    if (mergeId) {
      onDone({
        groceryItemId: item.groceryItemId,
        type: "merge",
        pantryItemId: mergeId,
        quantity,
      });
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;
    onDone({
      groceryItemId: item.groceryItemId,
      type: "create",
      name: trimmed,
      quantity,
      unit: unit.trim() || null,
      category,
      location,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {item.suggestions.length > 0 && (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            <BookOpen aria-hidden="true" size={15} className="shrink-0 text-accent" />
            Already in the inventory?
          </p>
          <div className="flex flex-col gap-2">
            {item.suggestions.map((suggestion) => {
              const picked = suggestion.pantryItemId === mergeId;
              return (
                <button
                  key={suggestion.pantryItemId}
                  type="button"
                  onClick={() => setMergeId(picked ? null : suggestion.pantryItemId)}
                  aria-pressed={picked}
                  className={`flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-colors ${
                    picked
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line bg-surface active:bg-surface-2"
                  }`}
                >
                  <span className="font-medium">{suggestion.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {suggestion.quantity}
                    {suggestion.unit ? ` ${suggestion.unit}` : ""} ·{" "}
                    {suggestion.location}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mergedSuggestion ? (
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-sm">
            Adding to <span className="font-semibold">{mergedSuggestion.name}</span>{" "}
            instead of creating a new item.
          </p>
          <div className="mt-3">
            <Field label="How many">
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                min={1}
                label={mergedSuggestion.name}
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
        onClick={handleSubmit}
        disabled={submitting || (!mergeId && !name.trim())}
        className="mt-2 min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-40"
      >
        {submitting ? "Putting away…" : isLast ? "Put away all" : "Next"}
      </button>
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
