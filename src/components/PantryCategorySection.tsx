"use client";

import { createElement } from "react";
import { ChevronRight } from "lucide-react";
import { PantryRow } from "./PantryRow";
import { categoryIcon } from "@/lib/constants";
import type { PantryItemView } from "@/lib/types";

export type PantryGroup = {
  category: string;
  items: PantryItemView[];
  lowCount: number;
};

/**
 * One collapsible category on Inventory: the header button and, when open,
 * its rows. Moved out of PantryList unchanged so that file stays small;
 * PantryList still owns which categories are open and what a row does.
 */
export function PantryCategorySection({
  group,
  open,
  onToggle,
  rowHandlers,
}: {
  group: PantryGroup;
  open: boolean;
  onToggle: () => void;
  rowHandlers: (item: PantryItemView) => Omit<
    React.ComponentProps<typeof PantryRow>,
    "item"
  >;
}) {
  return (
    <section>
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-h-12 w-full items-center gap-2 rounded-xl px-1 text-left text-sm font-semibold uppercase tracking-wide text-muted transition-colors active:bg-surface-2"
        >
          <ChevronRight
            aria-hidden="true"
            size={16}
            className={`shrink-0 transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
          {createElement(categoryIcon(group.category), {
            "aria-hidden": true,
            size: 16,
            className: "shrink-0",
          })}
          <span className="min-w-0 flex-1">
            {group.category}{" "}
            <span className="font-normal normal-case">
              ({group.items.length})
            </span>
          </span>
          {/* The low count rides on the header so a shut group still
              tells you whether anything inside needs attention. */}
          {group.lowCount > 0 && (
            <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium normal-case text-warn">
              {group.lowCount} low
            </span>
          )}
        </button>
      </h2>

      {open && (
        <ul className="mt-2 space-y-2">
          {group.items.map((item) => (
            <PantryRow key={item.id} item={item} {...rowHandlers(item)} />
          ))}
        </ul>
      )}
    </section>
  );
}
