import {
  checkOffBody,
  fromLowInventoryBody,
  putAwayBody,
  shoppingAddBody,
  shoppingListQuery,
  shoppingPatchBody,
} from "./schemasShopping";
import type { Operation } from "./openapiTypes";

// The registry rows for the shopping routes. Adding a route means adding its
// row here — openapi.test.ts fails until you do.

export const shoppingOperations: Operation[] = [
  {
    method: "GET",
    path: "/shopping",
    action: "shopping.list",
    summary: "The shopping list: unchecked first, then checked; supermarket order within each. store=none means no store chosen.",
    query: shoppingListQuery,
    response: "{ items } — each carries fromInventoryId and addedBy ({kind:'assistant'} | {kind:'person',name} | null).",
  },
  {
    method: "POST",
    path: "/shopping",
    action: "shopping.add",
    summary: "Add one item or an array of up to 50. With merge (default true), an unchecked row with the same name and store gets the quantity added instead.",
    body: shoppingAddBody,
    response: "201 { items: [{ item, merged }] }",
  },
  {
    method: "PATCH",
    path: "/shopping/{id}",
    action: "shopping.update",
    summary: "Change any of an item's fields, or tick/untick it with checked. note: null clears the note.",
    body: shoppingPatchBody,
    response: "{ item }. 404 if the item doesn't exist.",
  },
  {
    method: "DELETE",
    path: "/shopping/{id}",
    action: "shopping.delete",
    summary: "Delete an item Winnie added herself. Items a family member added are refused with 403 forbidden; check them off instead.",
    response: "{ deleted: id }. 403 forbidden for items not added by the assistant; 404 if missing.",
  },
  {
    method: "POST",
    path: "/shopping/check-off",
    action: "shopping.checkOff",
    summary: "Tick (or untick, with checked: false) several items at once. If any id is missing, nothing changes.",
    body: checkOffBody,
    response: "{ updated: n }. 404 with details.missing lists unknown ids.",
  },
  {
    method: "POST",
    path: "/shopping/put-away",
    action: "shopping.putAway",
    summary:
      "Move checked items into the inventory. Acts on EVERY checked row, including ones a family member ticked on their phone. " +
      "Send {} to put away known items only: if any checked item is new to the inventory it answers 200 { needsReview: true, classification } and writes nothing. " +
      "Send decisions to merge or create the new ones, or acceptDefaults: true to create them from the shopping row (location Other).",
    body: putAwayBody,
    response:
      "{ putAway: { items: [{ groceryItemId, name, action, inventoryId, quantityAdded }] } } or 200 { needsReview, classification }. " +
      "409 conflict (details.groceryItemIds, classification) when decisions leave a new item undecided; nothing is written.",
  },
  {
    method: "POST",
    path: "/shopping/from-low-inventory",
    action: "shopping.fromLowInventory",
    summary: "Add every low or out inventory item to the list (skipping any already on it). Send {} for no store.",
    body: fromLowInventoryBody,
    response: "201 { items } — the rows created (possibly none).",
  },
];
