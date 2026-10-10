import { z } from "zod";
import { CATEGORY_NAMES, LOCATION_NAMES, STORES } from "@/lib/constants";
import { calendarDateString } from "@/lib/assistant/schemas";

// Request shapes for the Assistant API's shopping and put-away routes. Pure
// (zod only), `.strict()` everywhere, vocabularies from constants.ts.
// `calendarDateString` is re-exported for the date fields routes may add.

export { calendarDateString };

const category = z.enum(CATEGORY_NAMES as [string, ...string[]]);
const location = z.enum(LOCATION_NAMES as [string, ...string[]]);
const store = z.enum(STORES);
const name = z.string().trim().min(1).max(120);
const quantity = z.number().positive().max(10000);
const unit = z.string().max(30);
const note = z.string().max(200);

export const shoppingListQuery = z
  .object({
    store: z.union([store, z.literal("none")]).optional(),
    checked: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
  })
  .strict();

export const shoppingAddItem = z
  .object({
    name,
    quantity: quantity.default(1),
    unit: unit.nullable().optional(),
    category: category.optional(),
    store: store.nullable().optional(),
    note: note.optional(),
    merge: z.boolean().default(true),
  })
  .strict();

/** One item or an array of 1–50. */
export const shoppingAddBody = z.union([
  shoppingAddItem,
  z.array(shoppingAddItem).min(1).max(50),
]);

export const shoppingPatchBody = z
  .object({
    name: name.optional(),
    quantity: quantity.optional(),
    unit: unit.nullable().optional(),
    category: category.optional(),
    store: store.nullable().optional(),
    note: note.nullable().optional(),
    location: location.nullable().optional(),
    checked: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "Send at least one field to change.",
  });

export const checkOffBody = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(100),
    checked: z.boolean().default(true),
  })
  .strict()
  .refine((body) => new Set(body.ids).size === body.ids.length, {
    message: "ids must be unique.",
  });

// Mirrors PutAwayDecision (src/app/actions/groceriesPutAway.ts, moving to
// src/lib/putAway.ts) without importing it; Fury reconciles the two.
const mergeDecision = z
  .object({
    groceryItemId: z.string().min(1),
    type: z.literal("merge"),
    pantryItemId: z.string().min(1),
    quantity,
  })
  .strict();

const createDecision = z
  .object({
    groceryItemId: z.string().min(1),
    type: z.literal("create"),
    name,
    quantity,
    unit: unit.nullable(),
    category,
    location,
  })
  .strict();

export const putAwayDecision = z.discriminatedUnion("type", [mergeDecision, createDecision]);

export const putAwayBody = z
  .object({
    decisions: z.array(putAwayDecision).max(200).optional(),
    acceptDefaults: z.boolean().default(false),
  })
  .strict();

export const fromLowInventoryBody = z
  .object({ store: store.nullable().optional() })
  .strict();
