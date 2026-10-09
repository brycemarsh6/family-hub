import {
  adjustBody,
  bulkAdjustBody,
  expiringQuery,
  inventoryCreateBody,
  inventoryListQuery,
  inventoryPatchBody,
  leftoverBody,
} from "./schemas";
import type { Operation } from "./openapiTypes";

// The registry rows for the inventory, leftovers and family routes. Adding a
// route means adding its row here — openapi.test.ts fails until you do.

export const inventoryOperations: Operation[] = [
  {
    method: "GET",
    path: "/inventory",
    action: "inventory.list",
    summary: "List inventory items, filtered by location, category, status or a search.",
    query: inventoryListQuery,
    response: "{ items, today } — items carry status, expiry and onShoppingList.",
  },
  {
    method: "POST",
    path: "/inventory",
    action: "inventory.create",
    summary: "Add an inventory item. 409 if a matching name exists, unless allowDuplicate.",
    body: inventoryCreateBody,
    response: "201 { item }. 409 conflict lists the matches.",
  },
  {
    method: "GET",
    path: "/inventory/{id}",
    action: "inventory.get",
    summary: "Read one inventory item.",
    response: "{ item }",
  },
  {
    method: "PATCH",
    path: "/inventory/{id}",
    action: "inventory.update",
    summary: "Change any of an item's fields. expiresOn: null clears the date.",
    body: inventoryPatchBody,
    response: "{ item }",
  },
  {
    method: "POST",
    path: "/inventory/{id}/adjust",
    action: "inventory.adjust",
    summary: "Add or remove quantity by a delta (never below zero).",
    body: adjustBody,
    response: "{ item, before, after }",
  },
  {
    method: "POST",
    path: "/inventory/bulk-adjust",
    action: "inventory.bulkAdjust",
    summary: "Adjust several items at once; all succeed or none are changed.",
    body: bulkAdjustBody,
    response: "{ results: [{ id, before, after }] }. 404 lists missing ids.",
  },
  {
    method: "GET",
    path: "/inventory/expiring",
    action: "inventory.expiring",
    summary: "Items whose expiry is within N days (overdue included), soonest first.",
    query: expiringQuery,
    response: "{ items, today } — each item also carries urgency: now | week | later.",
  },
  {
    method: "GET",
    path: "/inventory/review",
    action: "inventory.review",
    summary: "The duplicate / irregularity review queue.",
    response: "{ total, pairs, parked }",
  },
  {
    method: "POST",
    path: "/leftovers",
    action: "leftovers.create",
    summary: "Log a leftover; it expires daysGood days from today.",
    body: leftoverBody,
    response: "201 { item }",
  },
  {
    method: "GET",
    path: "/family",
    action: "family.list",
    summary: "The household's people (never credentials).",
    response: "{ members: [{ id, displayName, role, isKid, isActive }] }",
  },
];
