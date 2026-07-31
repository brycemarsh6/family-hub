"use client";

import { QuantityStepper } from "./QuantityStepper";
import { categoryEmoji } from "@/lib/constants";
import type { GroceryItemView } from "@/lib/types";

export function GroceryRow({
  item,
  onToggle,
  onQuantityChange,
  onDelete,
}: {
  item: GroceryItemView;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-1 rounded-xl border border-line bg-surface pr-1">
      {/*
        The name and checkbox are one big button covering most of the row, so
        ticking something off never requires aiming at a small target. The
        stepper and delete sit outside it — a button can't legally contain
        other buttons.
      */}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={item.checked}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-left transition-colors active:bg-surface-2"
      >
        <span
          aria-hidden="true"
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold transition-colors ${
            item.checked
              ? "border-accent bg-accent text-accent-fg"
              : "border-line"
          }`}
        >
          {item.checked ? "✓" : ""}
        </span>

        <span className="min-w-0 flex-1">
          {/* The name wraps rather than truncating: on a 375px phone, after the
              stepper and delete button there isn't room for a long name on one
              line, and a name you can't read defeats the point of the list. */}
          <span
            className={`block text-base font-medium ${
              item.checked ? "text-muted line-through" : ""
            }`}
          >
            {item.name}
          </span>
          {/* No category shown here normally — it's already the heading this row
              sits under. Checked items are listed together without headings,
              so those do get one. */}
          {(item.checked || item.pantryItemId) && (
            <span className="block truncate text-sm text-muted">
              {item.checked && (
                <>
                  <span aria-hidden="true">{categoryEmoji(item.category)}</span>{" "}
                  {item.category}
                </>
              )}
              {item.checked && item.pantryItemId && " · "}
              {item.pantryItemId && "from pantry"}
            </span>
          )}
        </span>
      </button>

      {/* Once something's in the trolley the quantity stops mattering, so we
          reclaim that space on narrow screens. */}
      {!item.checked && (
        <QuantityStepper
          value={item.quantity}
          unit={item.unit}
          onChange={onQuantityChange}
          min={1}
          label={item.name}
          size="sm"
        />
      )}

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove ${item.name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg text-muted transition-colors hover:bg-surface-2 hover:text-danger active:bg-line"
      >
        ×
      </button>
    </li>
  );
}
