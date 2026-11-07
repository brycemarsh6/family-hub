import { z } from "zod";
import { MEAL_SLOTS } from "@/lib/constants";
import { calendarDateString } from "@/lib/assistant/schemas";

// Request shapes for the Assistant API's meal-plan routes. Pure (zod only),
// `.strict()` everywhere, the slot vocabulary from constants.ts.

/** `?weekOf=`: any day; its Denver Sunday is the week. Omitted = this week. */
export const mealPlanWeekQuery = z
  .object({ weekOf: calendarDateString.optional() })
  .strict();

/** The path parameters of `/meal-plan/days/{date}/{slot}`. */
export const mealSlotParams = z
  .object({ date: calendarDateString, slot: z.enum(MEAL_SLOTS) })
  .strict();

export const mealPlanPutBody = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    recipeId: z.string().min(1).optional(),
  })
  .strict()
  .refine((body) => body.title !== undefined || body.recipeId !== undefined, {
    message: "Send a title, a recipeId, or both.",
  });
