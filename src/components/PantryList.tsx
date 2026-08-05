"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { PantryRow } from "./PantryRow";
import { PantryItemEditSheet, type PantryItemEdits } from "./PantryItemEditSheet";
import { StorePickerSheet } from "./StorePickerSheet";
import { EmptyState } from "./EmptyState";
import {
  LOCATIONS,
  locationIcon,
  categoryIcon,
  categoryOrder,
  isLow,
} from "@/lib/constants";
import { searchItems } from "@/lib/match";
import type { PantryItemView } from "@/lib/types";
import {
  setPantryQuantity,
  editPantryItem,
  deletePantryItem,
  addPantryItemToGroceryList,
} from "@/app/actions/pantry";

type Change =
  | { type: "quantity"; id: string; quantity: number }
  | { type: "addToList"; id: string }
  | { type: "edit"; id: string; edits: PantryItemEdits }
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
    case "addToList":
      return items.map((item) =>
        item.id === change.id ? { ...item, onList: true } : item,
      );
    case "edit":
      return items.map((item) =>
        item.id === change.id ? { ...item, ...change.edits } : item,
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
  const [query, setQuery] = useState("");
  // Which item (if any) has its edit sheet open. Just an id, not the item
  // itself, so the sheet always reads the latest optimistic data for it.
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingItem = optimisticItems.find((item) => item.id === editingId);

  // Which item (if any) is waiting on a store choice before it goes on the
  // list. The cart button doesn't add the item directly anymore — it opens
  // this sheet, and the item is only added once a store is picked or skipped.
  const [pickingStoreForId, setPickingStoreForId] = useState<string | null>(
    null,
  );
  const pickingStoreItem = optimisticItems.find(
    (item) => item.id === pickingStoreForId,
  );

  // Which category groups are expanded.
  //
  // Groups holding something low start open — running low is the reason you
  // opened this page, so collapsing that away would defeat the point. Passing
  // a function to useState means this runs once, on first render only: topping
  // an item back up won't yank its group shut while you're looking at it.
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    const open = new Set<string>();
    for (const item of items) {
      if (isLow(item.quantity, item.lowThreshold)) open.add(item.category);
    }
    return open;
  });

  function toggleCategory(category: string) {
    setOpenCategories((previous) => {
      const next = new Set(previous);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

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

  // Searching within whatever the location chips already narrowed to, so
  // "Fridge" + "milk" is a real combination, not two separate filters that
  // fight each other. Ranked by match quality, not A-Z — the whole point of
  // typing "straw" is that Strawberries floats above Frozen strawberries.
  const searchResults = query.trim() ? searchItems(query, visible) : null;

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

  // Grouped by category, in the supermarket order from constants.ts. Location
  // is handled by the filter chips above instead — between them, the chips
  // answer "what's in the freezer" and the groups answer "where's the pasta".
  //
  // Building groups from the items themselves means a category with nothing in
  // it simply never appears — no need to filter empty ones out, and no wall of
  // headers for the twenty-odd categories this house doesn't stock.
  const groups = [...new Set(visible.map((item) => item.category))]
    .sort((a, b) => categoryOrder(a) - categoryOrder(b))
    .map((category) => {
      const groupItems = sortItems(
        visible.filter((i) => i.category === category),
      );
      return {
        category,
        items: groupItems,
        lowCount: groupItems.filter((i) => isLow(i.quantity, i.lowThreshold))
          .length,
      };
    });

  const allOpen =
    groups.length > 0 && groups.every((g) => openCategories.has(g.category));

  function toggleAll() {
    setOpenCategories(
      allOpen ? new Set() : new Set(groups.map((g) => g.category)),
    );
  }

  function rowHandlers(item: PantryItemView) {
    return {
      onQuantityChange: (quantity: number) =>
        run({ type: "quantity", id: item.id, quantity }, () =>
          setPantryQuantity(item.id, quantity),
        ),
      onAddToList: () => setPickingStoreForId(item.id),
      onEdit: () => setEditingId(item.id),
      onDelete: () =>
        run({ type: "delete", id: item.id }, () => deletePantryItem(item.id)),
    };
  }

  return (
    <div>
      {/* Big touch target, one tap to clear — typed search, not voice or
          barcode (those are separate, planned features), just "don't make me
          scroll to find the thing I typed part of the name of." */}
      <div className="relative mb-3">
        <Search
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the inventory…"
          className="min-h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-base placeholder:text-muted"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X aria-hidden="true" size={18} />
          </button>
        )}
      </div>

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
            const OptionIcon = option !== ALL ? locationIcon(option) : null;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={active}
                className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {OptionIcon && <OptionIcon aria-hidden="true" size={16} />}
                {option} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {searchResults ? (
        searchResults.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title={`No matches for "${query.trim()}"`}
            hint="Try a shorter or different word — search matches the start of any word in the name."
          />
        ) : (
          // Flat and ranked, not grouped by category — the point of typing
          // "straw" is seeing Strawberries first, not hunting through
          // Produce and Meals & Frozen Food to find it.
          <ul className="space-y-2">
            {searchResults.map((item) => (
              <PantryRow key={item.id} item={item} {...rowHandlers(item)} />
            ))}
          </ul>
        )
      ) : visible.length === 0 ? (
        <EmptyState
          emoji="🥫"
          title={filter === ALL ? "The pantry is empty" : `Nothing in ${filter}`}
          hint="Add what you have below, and the app will tell you when it runs low."
        />
      ) : (
        <div className="space-y-2">
          {/* One tap to open or shut everything, so a collapsed list is never
              a hunt through twenty headers for the thing you want. */}
          <div className="flex justify-end pb-1">
            <button
              type="button"
              onClick={toggleAll}
              className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>

          {groups.map((group) => {
            const CategoryIcon = categoryIcon(group.category);
            const open = openCategories.has(group.category);
            return (
              <section key={group.category}>
                <h2>
                  <button
                    type="button"
                    onClick={() => toggleCategory(group.category)}
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
                    <CategoryIcon aria-hidden="true" size={16} className="shrink-0" />
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
                      <PantryRow
                        key={item.id}
                        item={item}
                        {...rowHandlers(item)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {editingItem && (
        <PantryItemEditSheet
          key={editingItem.id}
          item={editingItem}
          onClose={() => setEditingId(null)}
          onSave={(edits) => {
            run({ type: "edit", id: editingItem.id, edits }, () =>
              editPantryItem(editingItem.id, edits),
            );
            setEditingId(null);
          }}
          onDelete={() => {
            run({ type: "delete", id: editingItem.id }, () =>
              deletePantryItem(editingItem.id),
            );
            setEditingId(null);
          }}
        />
      )}

      {pickingStoreItem && (
        <StorePickerSheet
          key={pickingStoreItem.id}
          title={`Add ${pickingStoreItem.name} — which store?`}
          onChoose={(store) => {
            run({ type: "addToList", id: pickingStoreItem.id }, () =>
              addPantryItemToGroceryList(pickingStoreItem.id, store),
            );
            setPickingStoreForId(null);
          }}
          onSkip={() => {
            run({ type: "addToList", id: pickingStoreItem.id }, () =>
              addPantryItemToGroceryList(pickingStoreItem.id, null),
            );
            setPickingStoreForId(null);
          }}
        />
      )}
    </div>
  );
}
