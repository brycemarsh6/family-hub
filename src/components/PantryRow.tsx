"use client";

import { useState } from "react";
import { QuantityStepper } from "./QuantityStepper";
import { LOCATIONS, isLow } from "@/lib/constants";
import type { PantryItemView } from "@/lib/types";

export function PantryRow({
  item,
  onQuantityChange,
  onAddToList,
  onLocationChange,
  onThresholdChange,
  onDelete,
}: {
  item: PantryItemView;
  onQuantityChange: (quantity: number) => void;
  onAddToList: () => void;
  onLocationChange: (location: string) => void;
  onThresholdChange: (lowThreshold: number) => void;
  onDelete: () => void;
}) {
  // Details are hidden until you tap the name, so the everyday job — bumping a
  // count up or down — stays a single uncluttered row.
  const [open, setOpen] = useState(false);
  const low = isLow(item.quantity, item.lowThreshold);

  return (
    <li className="rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          aria-expanded={open}
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

      {open && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line px-3 py-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            Kept in
            <select
              value={item.location}
              onChange={(event) => onLocationChange(event.target.value)}
              className="min-h-10 rounded-lg bg-surface-2 px-2 text-sm text-fg outline-none"
            >
              {LOCATIONS.map((location) => (
                <option key={location.name} value={location.name}>
                  {location.emoji} {location.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2 text-sm text-muted">
            Low at
            <QuantityStepper
              value={item.lowThreshold}
              onChange={onThresholdChange}
              min={0}
              label={`low threshold for ${item.name}`}
              size="sm"
            />
          </div>

          <button
            type="button"
            onClick={onDelete}
            className="ml-auto min-h-10 rounded-lg px-3 text-sm font-medium text-danger transition-colors hover:bg-surface-2"
          >
            Remove item
          </button>
        </div>
      )}
    </li>
  );
}
