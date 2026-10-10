import "server-only";

// The one place /summary reads the database. One Promise.all, so the route
// costs one round trip of parallel queries however many sections it has.

import { db } from "@/lib/db";
import { getCalendarEventsInRange } from "@/lib/calendarEventQuery";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { addCalendarDays, zoneMidnightInstant, type CalendarDate } from "@/lib/householdDate";

const PLAN_WINDOW_MS = 14 * 60 * 60 * 1000;

export async function readSummaryData(today: CalendarDate, sunday: CalendarDate) {
  const sundayInstant = zoneMidnightInstant(sunday, HOUSEHOLD_TIME_ZONE).getTime();
  const [pantry, groceries, recipeCount, plans, events] = await Promise.all([
    db.pantryItem.findMany({
      select: {
        name: true,
        category: true,
        location: true,
        quantity: true,
        lowThreshold: true,
        expiresAt: true,
        restockedAt: true,
      },
    }),
    db.groceryItem.findMany({ where: { checked: false }, select: { store: true } }),
    db.recipe.count(),
    db.mealPlan.findMany({
      where: {
        weekStart: {
          gte: new Date(sundayInstant - PLAN_WINDOW_MS),
          lte: new Date(sundayInstant + PLAN_WINDOW_MS),
        },
      },
      select: {
        weekStart: true,
        entries: { select: { dayOffset: true, slot: true, title: true, recipeId: true } },
      },
    }),
    getCalendarEventsInRange(
      zoneMidnightInstant(today, HOUSEHOLD_TIME_ZONE),
      zoneMidnightInstant(addCalendarDays(today, 2), HOUSEHOLD_TIME_ZONE),
    ),
  ]);
  return { pantry, groceries, recipeCount, plans, events };
}
