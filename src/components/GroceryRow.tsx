"use client";

import { createElement } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { QuantityStepper } from "./QuantityStepper";
import { SwipeActions } from "./SwipeActions";
import { categoryIcon, STORE_ICON as StoreIcon } from "@/lib/constants";
import type { GroceryItemView } from "@/lib/types";

export function GroceryRow({
  item,
  onToggle,
  onQuantityChange,
  onEdit,
  onDelete,
}: {
  item: GroceryItemView;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
  /** Opens the edit sheet (name, quantity, unit, category, store). */
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-xl border border-line bg-surface">
      {/* Swipe right-to-left for Edit and Delete. Both live behind the swipe
          rather than on the row because the row's own tap is already the
          most important action on this page — ticking an item off while
          holding a phone in a shop. Delete sits furthest out so a short,
          hesitant swipe surfaces Edit rather than the destructive one. */}
      <SwipeActions
        actions={[
          {
            label: "Edit",
            accessibleLabel: `Edit ${item.name}`,
            icon: <Pencil aria-hidden="true" size={18} />,
            onAction: onEdit,
            tone: "neutral",
          },
          {
            label: "Delete",
            accessibleLabel: `Delete ${item.name}`,
            icon: <Trash2 aria-hidden="true" size={18} />,
            onAction: onDelete,
            tone: "danger",
          },
        ]}
      >
        <div className="flex items-center gap-1 pr-1">
      {/*
        The name and checkbox are one big button covering most of the row, so
        ticking something off never requires aiming at a small target. The
        stepper sits outside it — a button can't legally contain other
        buttons.
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
              so those do get one. Store shows whenever it's set, checked or
              not — it's the whole point of this feature. */}
          {(item.checked || item.pantryItemId || item.store) && (
            <span className="block truncate text-sm text-muted">
              {item.checked && (
                <span className="inline-flex items-center gap-1 align-text-bottom">
                  {createElement(categoryIcon(item.category), {
                    "aria-hidden": true,
                    size: 14,
                  })}
                  {item.category}
                </span>
              )}
              {item.checked && item.pantryItemId && " · "}
              {/* "inventory", not "pantry": Pantry is one of four storage
                  locations, so "from pantry" read as a claim about which
                  shelf it lives on rather than "this came off the
                  Inventory list". The database column stays pantryItemId —
                  renaming that is a migration with no user benefit. */}
              {item.pantryItemId && "from inventory"}
              {(item.checked || item.pantryItemId) && item.store && " · "}
              {item.store && (
                <span className="inline-flex items-center gap-1 align-text-bottom">
                  <StoreIcon aria-hidden="true" size={14} />
                  {item.store}
                </span>
              )}
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
        </div>
      </SwipeActions>
    </li>
  );
}
