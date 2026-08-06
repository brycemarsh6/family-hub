"use client";

import { Trash2 } from "lucide-react";
import { QuantityStepper } from "./QuantityStepper";
import { SwipeActions } from "./SwipeActions";
import { isLow } from "@/lib/constants";
import type { PantryItemView } from "@/lib/types";

export function PantryRow({
  item,
  onQuantityChange,
  onAddToList,
  onEdit,
  onDelete,
}: {
  item: PantryItemView;
  onQuantityChange: (quantity: number) => void;
  onAddToList: () => void;
  /** Opens the full edit sheet (name, quantity, unit, category, location, threshold, delete). */
  onEdit: () => void;
  onDelete: () => void;
}) {
  const low = isLow(item.quantity, item.lowThreshold);

  return (
    <li className="rounded-xl border border-line bg-surface">
      {/* Swipe right-to-left to delete. Before this, removing a pantry item
          meant opening the edit sheet and finding Delete in there — fine for
          a considered edit, far too slow for "we finished the milk". No Edit
          action here, unlike shopping rows: tapping a pantry row already
          opens the full edit sheet. */}
      <SwipeActions
        actions={[
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
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-left transition-colors active:bg-surface-2"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium">{item.name}</span>
            {/* The location isn't repeated here: it's always either the group
                heading above or the selected filter chip. */}
            <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
              {/* "Out" and "Low" are different problems: one means don't plan
                  dinner around it, the other means pick some up soon. */}
              {item.quantity === 0 ? (
                <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-danger">
                  Out
                </span>
              ) : (
                low && (
                  <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">
                    Low
                  </span>
                )
              )}
              {item.onList && <span className="text-xs">on the list</span>}
            </span>
          </span>
        </button>

        <QuantityStepper
          value={item.quantity}
          unit={item.unit}
          onChange={onQuantityChange}
          min={0}
          label={item.name}
          size="sm"
        />

        <button
          type="button"
          onClick={onAddToList}
          disabled={item.onList}
          aria-label={
            item.onList
              ? `${item.name} is already on the grocery list`
              : `Add ${item.name} to the grocery list`
          }
          title={item.onList ? "Already on the list" : "Add to grocery list"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg transition-colors hover:bg-surface-2 active:bg-line disabled:opacity-30"
        >
          <span aria-hidden="true">🛒</span>
        </button>
      </div>
      </SwipeActions>
    </li>
  );
}
