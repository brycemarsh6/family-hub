"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ExpiringRow, type Urgency } from "./ExpiringRow";
import { PantryItemEditSheet, type PantryItemEdits } from "./PantryItemEditSheet";
import { StorePickerSheet } from "./StorePickerSheet";
import { EmptyState } from "./EmptyState";
import type { PantryItemView } from "@/lib/types";
import {
  setPantryQuantity,
  editPantryItem,
  deletePantryItem,
  addPantryItemToGroceryList,
} from "@/app/actions/pantry";

export type ExpiringEntry = {
  item: PantryItemView;
  /** "Today", "3 days left", "2 days overdue" — computed server-side. */
  label: string;
  urgency: Urgency;
  isEstimate: boolean;
};

type Change =
  | { type: "quantity"; id: string; quantity: number }
  | { type: "addToList"; id: string }
  | { type: "edit"; id: string; edits: PantryItemEdits }
  | { type: "delete"; id: string };

function applyChange(entries: ExpiringEntry[], change: Change): ExpiringEntry[] {
  switch (change.type) {
    case "quantity":
      return entries.map((e) =>
        e.item.id === change.id
          ? { ...e, item: { ...e.item, quantity: change.quantity } }
          : e,
      );
    case "addToList":
      return entries.map((e) =>
        e.item.id === change.id ? { ...e, item: { ...e.item, onList: true } } : e,
      );
    case "edit":
      // Editing here can change the date (or the quantity, category,
      // location...) enough to move an item off this page entirely — e.g.
      // typing in a real expiry date that's months away. Rather than guess
      // at a new label/urgency client-side, this just removes the row; the
      // next real load picks up wherever the edit actually landed it.
      return entries.filter((e) => e.item.id !== change.id);
    case "delete":
      return entries.filter((e) => e.item.id !== change.id);
  }
}

const SECTION_TITLES: Record<Urgency, string> = {
  now: "Eat now",
  week: "This week",
  later: "Coming up",
};

/**
 * The Expiring page's list. Flat by urgency, not grouped by category —
 * Inventory already answers "where's the pasta"; this page answers "what
 * needs eating", and category is irrelevant to that question.
 */
export function ExpiringList({ entries }: { entries: ExpiringEntry[] }) {
  const [optimisticEntries, applyOptimistic] = useOptimistic(
    entries,
    applyChange,
  );
  const [, startTransition] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingEntry = optimisticEntries.find((e) => e.item.id === editingId);

  const [pickingStoreForId, setPickingStoreForId] = useState<string | null>(
    null,
  );
  const pickingStoreEntry = optimisticEntries.find(
    (e) => e.item.id === pickingStoreForId,
  );

  function run(change: Change, serverAction: () => Promise<void>) {
    startTransition(async () => {
      applyOptimistic(change);
      await serverAction();
    });
  }

  function rowHandlers(item: PantryItemView) {
    return {
      onQuantityChange: (quantity: number) =>
        run({ type: "quantity", id: item.id, quantity }, () =>
          setPantryQuantity(item.id, quantity),
        ),
      onAddToList: () => setPickingStoreForId(item.id),
      onEdit: () => setEditingId(item.id),
    };
  }

  if (optimisticEntries.length === 0) {
    return (
      <EmptyState
        emoji="✅"
        title="Nothing expiring soon"
        hint="Items with an estimate inside two weeks — or a real date you've entered — show up here."
      />
    );
  }

  const sections = (["now", "week", "later"] as const)
    .map((urgency) => ({
      urgency,
      items: optimisticEntries.filter((e) => e.urgency === urgency),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.urgency}>
          <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
            {SECTION_TITLES[section.urgency]}
          </h2>
          <ul className="space-y-2">
            {section.items.map((entry) => (
              <ExpiringRow
                key={entry.item.id}
                item={entry.item}
                label={entry.label}
                urgency={entry.urgency}
                isEstimate={entry.isEstimate}
                {...rowHandlers(entry.item)}
              />
            ))}
          </ul>
        </section>
      ))}

      {editingEntry && (
        <PantryItemEditSheet
          key={editingEntry.item.id}
          item={editingEntry.item}
          onClose={() => setEditingId(null)}
          onSave={(edits) => {
            run({ type: "edit", id: editingEntry.item.id, edits }, () =>
              editPantryItem(editingEntry.item.id, edits),
            );
            setEditingId(null);
          }}
          onDelete={() => {
            run({ type: "delete", id: editingEntry.item.id }, () =>
              deletePantryItem(editingEntry.item.id),
            );
            setEditingId(null);
          }}
        />
      )}

      {pickingStoreEntry && (
        <StorePickerSheet
          key={pickingStoreEntry.item.id}
          title={`Add ${pickingStoreEntry.item.name} — which store?`}
          onChoose={(store) => {
            run({ type: "addToList", id: pickingStoreEntry.item.id }, () =>
              addPantryItemToGroceryList(pickingStoreEntry.item.id, store),
            );
            setPickingStoreForId(null);
          }}
          onSkip={() => {
            run({ type: "addToList", id: pickingStoreEntry.item.id }, () =>
              addPantryItemToGroceryList(pickingStoreEntry.item.id, null),
            );
            setPickingStoreForId(null);
          }}
        />
      )}
    </div>
  );
}
