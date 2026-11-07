import { z } from "zod";

// Request shapes for the Assistant API's recipe and tag routes. Pure (zod
// only), `.strict()` everywhere. Ingredient and step lines travel as arrays
// of strings and are joined with "\n" on the way into the database, so a
// line must not contain a newline of its own (it would become two lines).

const id = z.string().trim().min(1).max(60);
const line = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => !/[\r\n]/.test(value), { message: "One line per entry; no line breaks." });
const lines = z.array(line).min(1).max(200);
const title = z.string().trim().min(1).max(200);
const servings = z.string().max(60);
const duration = z.string().max(60);
const sourceUrl = z.string().max(2000);
const notes = z.string().max(5000);

export const recipesListQuery = z
  .object({
    q: z.string().max(100).optional(),
    tagId: id.optional(),
    cookbookId: id.optional(),
    maxMinutes: z.coerce.number().int().min(1).max(10000).optional(),
  })
  .strict();

export const recipeCreateBody = z
  .object({
    title,
    ingredients: lines,
    steps: lines,
    servings: servings.nullable().optional(),
    prepTime: duration.nullable().optional(),
    cookTime: duration.nullable().optional(),
    sourceUrl: sourceUrl.nullable().optional(),
    notes: notes.nullable().optional(),
    cookbookId: id.optional(),
    tagIds: z.array(id).max(50).optional(),
  })
  .strict();

export const recipePatchBody = z
  .object({
    title: title.optional(),
    ingredients: lines.optional(),
    steps: lines.optional(),
    servings: servings.nullable().optional(),
    prepTime: duration.nullable().optional(),
    cookTime: duration.nullable().optional(),
    sourceUrl: sourceUrl.nullable().optional(),
    notes: notes.nullable().optional(),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    /** The recipe's full tag set; ids left out are taken off. */
    tagIds: z.array(id).max(50).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "Send at least one field to change.",
  });

/** Cooked, share: no input; an empty body or `{}` is fine. */
export const recipeActionBody = z.object({}).strict().optional();

export const tagCreateBody = z
  .object({ name: z.string().trim().min(1).max(40) })
  .strict();
