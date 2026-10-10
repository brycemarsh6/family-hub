import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { summaryQuery } from "@/lib/assistant/schemas";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { readSummaryData } from "@/lib/assistant/summaryReads";
import { toAssistantEvent } from "@/lib/assistant/serializeCalendar";
import {
  bucketEventsByDay,
  findPlanForWeek,
  sundayOfCalendarDate,
  summarizeInventory,
} from "@/lib/assistant/summary";
import { storeBreakdown } from "@/lib/dashboard";
import { HOUSEHOLD_TIME_ZONE, MEAL_SLOTS } from "@/lib/constants";
import { addCalendarDays, calendarDaysBetween, formatCalendarDate } from "@/lib/householdDate";

// Not dashboard.ts's `todaysMeals`: that compares process-local dates, which
// on Vercel's UTC runtime is the wrong day every Denver evening.
export const GET = assistantRoute({
  action: "summary.get",
  query: summaryQuery,
  handler: async ({ query, now }) => {
    const today = requireHouseholdToday(now, query.date);
    const tomorrow = addCalendarDays(today, 1);
    const sunday = sundayOfCalendarDate(today);

    const { pantry, groceries, recipeCount, plans, events } = await readSummaryData(today, sunday);

    const plan = findPlanForWeek(plans, sunday, HOUSEHOLD_TIME_ZONE);
    const dayOffset = calendarDaysBetween(sunday, today);
    const meals = MEAL_SLOTS.map((slot) => {
      const entry = plan?.entries.find((e) => e.dayOffset === dayOffset && e.slot === slot);
      return { slot, title: entry?.title ?? null, recipeId: entry?.recipeId ?? null };
    });

    const buckets = bucketEventsByDay(events, [today, tomorrow], HOUSEHOLD_TIME_ZONE);
    const day = (date: typeof today) => ({
      date: formatCalendarDate(date),
      events: (buckets.get(formatCalendarDate(date)) ?? []).map(toAssistantEvent),
    });

    return {
      data: {
        date: formatCalendarDate(today),
        meals,
        inventory: summarizeInventory(pantry, today, HOUSEHOLD_TIME_ZONE, 3),
        shopping: { toBuy: groceries.length, byStore: storeBreakdown(groceries) },
        recipes: { count: recipeCount },
        // Tasks join the calendar section in mission 24.
        calendar: { today: day(today), tomorrow: day(tomorrow) },
      },
    };
  },
});
