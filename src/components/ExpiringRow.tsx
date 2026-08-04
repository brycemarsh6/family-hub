"use client";

import { QuantityStepper } from "./QuantityStepper";
import type { PantryItemView } from "@/lib/types";

/** How urgently this needs eating — drives the badge's color, not its text. */
export type Urgency = "now" | "week" | "later";

const URGENCY_STYLE: Record<Urgency, string> = {
  now: "bg-danger-soft text-danger",
  week: "bg-warn-soft text-warn",
  later: "bg-surface-2 text-muted",
};

/**
 * A row on the Expiring page. Deliberately its own component rather than a
 * PantryRow variant: PantryRow's badge slot is Low/Out, which is Inventory's
 * question ("is there enough?"). This page asks a different one ("how long
 * do we have?"), so it gets its own badge — everything else (the stepper,
 * the cart button, tapping in to edit) is identical, and is the same
 * PantryItemEditSheet either page opens.
 */
export function ExpiringRow({
  item,
  label,
  urgency,
  isEstimate,
  onQuantityChange,
  onAddToList,
  onEdit,
}: {
  item: PantryItemView;
  /** "Today", "3 days left", "2 days overdue" — already computed server-side. */
  label: string;
  urgency: Urgency;
  /** True when `label` is a guess (see src/lib/shelfLife.ts), not a typed-in date. */
  isEstimate: boolean;
  onQuantityChange: (quantity: number) => void;
  onAddToList: () => void;
  onEdit: () => void;
}) {
  return (
    <li className="rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-left transition-colors active:bg-surface-2"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium">{item.name}</span>
            <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${URGENCY_STYLE[urgency]}`}
              >
                {/* The ~ is the whole trust mechanism: a guess never reads
                    the same as a date someone actually typed in. */}
                {isEstimate ? `~${label}` : label}
              </span>
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
    </li>
  );
}
