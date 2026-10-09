import { z } from "zod";
import { CATEGORY_NAMES, LOCATION_NAMES } from "@/lib/constants";
import { parseDateParam } from "@/lib/householdDate";

// Request shapes for the Assistant API's inventory / leftovers / family
// routes. Pure (zod only) so they are testable without a database. Every
// object is `.strict()`: a typo'd field is a 400, never silently ignored.
// The vocabularies come from constants.ts — never retyped here.

const category = z.enum(CATEGORY_NAMES as [string, ...string[]]);
const location = z.enum(LOCATION_NAMES as [string, ...string[]]);
/** A real `YYYY-MM-DD`: impossible days (2026-02-30) fail here, as a zod 400. */
export const calendarDateString = z
  .string()
  // The regex is what the generated OpenAPI document shows (a refine alone
  // leaves no trace in JSON Schema); the refine rejects impossible days.
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use a real date as YYYY-MM-DD." })
  .refine((value) => parseDateParam(value) !== null, { message: "Use a real date as YYYY-MM-DD." });
const name = z.string().trim().min(1).max(120);

export const inventoryListQuery = z
  .object({
    location: location.optional(),
    category: category.optional(),
    status: z.enum(["low", "out", "expiring", "ok"]).optional(),
    q: z.string().max(100).optional(),
    withinDays: z.coerce.number().int().min(1).max(60).default(7),
    date: calendarDateString.optional(),
  })
  .strict();

export const inventoryCreateBody = z
  .object({
    name,
    quantity: z.number().min(0).max(10000).default(1),
    unit: z.string().max(30).nullable().optional(),
    category: category.optional(),
    location: location.optional(),
    lowThreshold: z.number().min(0).max(10000).optional(),
    expiresOn: calendarDateString.nullable().optional(),
    allowDuplicate: z.boolean().default(false),
  })
  .strict();

export const inventoryPatchBody = z
  .object({
    name: name.optional(),
    quantity: z.number().min(0).max(10000).optional(),
    unit: z.string().max(30).nullable().optional(),
    category: category.optional(),
    location: location.optional(),
    lowThreshold: z.number().min(0).max(10000).optional(),
    expiresOn: calendarDateString.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "Send at least one field to change.",
  });

const delta = z
  .number()
  .finite()
  .refine((n) => n !== 0, { message: "delta must not be zero." })
  .refine((n) => Math.abs(n) <= 10000, { message: "delta is too large." });

export const adjustBody = z
  .object({ delta, reason: z.string().max(200).optional() })
  .strict();

export const bulkAdjustBody = z
  .object({
    adjustments: z
      .array(
        z.object({ id: z.string().min(1), delta, reason: z.string().max(200).optional() }).strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .refine(
    (body) => new Set(body.adjustments.map((a) => a.id)).size === body.adjustments.length,
    { message: "Each item id may appear only once per request.", path: ["adjustments"] },
  );

export const expiringQuery = z
  .object({
    withinDays: z.coerce.number().int().min(1).max(60).default(7),
    date: calendarDateString.optional(),
  })
  .strict();

export const leftoverBody = z
  .object({
    name,
    portions: z.number().min(0.5).max(50).default(1),
    daysGood: z.number().int().min(1).max(14).default(3),
    location: z.enum(["Fridge", "Freezer"]).default("Fridge"),
    date: calendarDateString.optional(),
  })
  .strict();

export const auditQuery = z
  .object({
    since: z.iso.datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    writesOnly: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .strict();
