"use client";

import { useOptimistic, useState, useTransition } from "react";
import { PantryRow } from "./PantryRow";
import { EmptyState } from "./EmptyState";
import { LOCATIONS, locationEmoji, locationOrder, isLow } from "@/lib/constants";
import type { PantryItemView } from "@/lib/types";
import {
  setPantryQuantity,
  updatePantryItem,
  deletePantryItem,
  addPantryItemToGroceryList,
} from "@/app/actions/pantry";

type Change =
  | { type: "quantity"; id: string; quantity: number }
  | { type: "location"; id: string; location: string }
  | { type: "threshold"; id: string; lowThreshold: number }
  | { type: "addToList"; id: string }
  | { type: "delete"; id: string };

function applyChange(
  items: PantryItemView[],
  change: Change,
): PantryItemView[] {
  switch (change.type) {
    case "quantity":
      return items.map((item) =>
        item.id === change.id ? { ...item, quantity: change.quantity } : item,
      );
    case "location":
      return items.map((item) =>
        item.id === change.id ? { ...item, location: change.location } : item,
      );
    case "threshold":
      return items.map((item) =>
        item.id === change.id
          ? { ...item, lowThreshold: change.lowThreshold }
          : item,
      );
    case "addToList":
      return items.map((item) =>
        item.id === change.id ? { ...item, onList: true } : item,
      );
    case "delete":
      return items.filter((item) => item.id !== change.id);
  }
}

const ALL = "All";

export function PantryList({ items }: { items: PantryItemView[] }) {
  const [optimisticItems, applyOptimistic] = useOptimistic(items, applyChange);
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>(ALL);

  function run(change: Change, serverAction: () => Promise<void>) {
    startTransition(async () => {
      applyOptimistic(change);
      await serverAction();
    });
  }

  const visible =
    filter === ALL
      ? optimisticItems
      : optimisticItems.filter((item) => item.location === filter);

  // Within any group, whatever's running low floats to the top — that's the
  // thing you actually came to the page to find. Everything else is A–Z.
  function sortItems(list: PantryItemView[]) {
    return [...list].sort((a, b) => {
      const aLow = isLow(a.quantity, a.lowThreshold);
      const bLow = isLow(b.quantity, b.lowThreshold);
      if (aLow !== bLow) return aLow ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  const groups =
    filter === ALL
      ? [...new Set(visible.map((item) => item.location))]
          .sort((a, b) => locationOrder(a) - locationOrder(b))
          .map((location) => ({
            location,
            items: sortItems(visible.filter((i) => i.location === location)),
          }))
      : [{ location: filter, items: sortItems(visible) }];

  function rowHandlers(item: PantryItemView) {
    return {
      onQuantityChange: (quantity: number) =>
        run({ type: "quantity", id: item.id, quantity }, () =>
          setPantryQuantity(item.id, quantity),
        ),
      onAddToList: () =>
        run({ type: "addToList", id: item.id }, () =>
          addPantryItemToGroceryList(item.id),
        ),
      onLocationChange: (location: string) =>
        run({ type: "location", id: item.id, location }, () =>
          updatePantryItem(item.id, { location }),
        ),
      onThresholdChange: (lowThreshold: number) =>
        run({ type: "threshold", id: item.id, lowThreshold }, () =>
          updatePantryItem(item.id, { lowThreshold }),
        ),
      onDelete: () =>
        run({ type: "delete", id: item.id }, () => deletePantryItem(item.id)),
    };
  }

  return (
    <div>
      {/*
        Filter chips. They scroll sideways rather than wrapping or shrinking:
        five of them won't fit across a 375px phone, and shrinking them below a
        fingertip would defeat the point of a kitchen-tablet app.
      */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {[ALL, ...LOCATIONS.map((l) => l.name)].map((option) => {
            const active = filter === option;
            const count =
              option === ALL
                ? optimisticItems.length
                : optimisticItems.filter((i) => i.location === option).length;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={active}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {option !== ALL && (
                  <span aria-hidden="true">{locationEmoji(option)} </span>
                )}
                {option} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          emoji="🥫"
          title={filter === ALL ? "The pantry is empty" : `Nothing in ${filter}`}
          hint="Add what you have below, and the app will tell you when it runs low."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.location}>
              {/* No heading when a single location is already selected — the
                  chip above says it. */}
              {filter === ALL && (
                <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
                  <span aria-hidden="true">
                    {locationEmoji(group.location)}
                  </span>
                  {group.location}
                  <span className="font-normal normal-case">
                    ({group.items.length})
                  </span>
                </h2>
              )}
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <PantryRow key={item.id} item={item} {...rowHandlers(item)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
