import type { PutAwayReport } from "@/lib/putAway"; // type only: erased, keeps this module pure

// DB row -> wire format for the Assistant API's shopping routes. Pure, and
// every output is built field by field: never a spread of a row, so a column
// added later (or the raw `addedById`) can't leak onto the wire by default.

type GroceryRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  store: string | null;
  checked: boolean;
  checkedAt: Date | null;
  note: string | null;
  location: string | null;
  pantryItemId: string | null;
  createdAt: Date;
};

export function toShoppingItem(
  row: GroceryRow,
  ctx: { addedByName: string | null; createdByAssistant: boolean },
) {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    category: row.category,
    store: row.store,
    checked: row.checked,
    checkedAt: row.checkedAt ? row.checkedAt.toISOString() : null,
    note: row.note,
    location: row.location,
    fromInventoryId: row.pantryItemId,
    addedBy: ctx.createdByAssistant
      ? ({ kind: "assistant" } as const)
      : ctx.addedByName !== null
        ? ({ kind: "person", name: ctx.addedByName } as const)
        : null,
    createdAt: row.createdAt.toISOString(),
  };
}

type Suggestion = {
  pantryItemId: string;
  name: string;
  quantity: number;
  unit: string | null;
  location: string;
};

type NewItem = {
  groceryItemId: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  location: string;
  suggestions: Suggestion[];
};

export function toPutAwayClassification(c: { knownCount: number; newItems: NewItem[] }) {
  return {
    knownCount: c.knownCount,
    newItems: c.newItems.map((n) => ({
      groceryItemId: n.groceryItemId,
      name: n.name,
      quantity: n.quantity,
      unit: n.unit,
      category: n.category,
      location: n.location,
      suggestions: n.suggestions.map((s) => ({
        inventoryId: s.pantryItemId,
        name: s.name,
        quantity: s.quantity,
        unit: s.unit,
        location: s.location,
      })),
    })),
  };
}

/** What a committed put-away did, per item — P1's real report, renamed for the wire. */
export function toPutAwayReport(report: PutAwayReport) {
  return {
    putAway: {
      items: report.items.map((e) => ({
        groceryItemId: e.groceryItemId,
        name: e.groceryName,
        action: e.action,
        inventoryId: e.pantryItemId,
        quantityAdded: e.quantityAdded,
      })),
      ignoredDecisions: report.ignoredDecisions,
    },
  };
}
