import { HOUSEHOLD_TIME_ZONE, MEAL_SLOTS, type MealSlot } from "@/lib/constants";
import {
  addCalendarDays,
  calendarDaysBetween,
  formatCalendarDate,
  startOfWeek,
  zoneMidnightInstant,
  type CalendarDate,
} from "@/lib/householdDate";

// Pure shapers for the meal-plan routes: which week a date is in, what a week
// looks like on the wire, and how a week's ingredient lines collapse into
// "what to buy". No database, no process-local date getters.

/** The Denver week a date belongs to: its Sunday, the instant a new plan is
 * stored at (zone midnight, which a Denver phone's `isSameDay` matches), and
 * the date's offset into the week. */
export function weekForDate(date: CalendarDate) {
  const sunday = startOfWeek(date);
  return {
    sunday,
    instant: zoneMidnightInstant(sunday, HOUSEHOLD_TIME_ZONE),
    dayOffset: calendarDaysBetween(sunday, date),
  };
}

export type MealCell = { title: string; recipeId: string | null; recipeTitle: string | null };

export function toMealCell(
  entry: { title: string; recipeId: string | null },
  recipeTitle: string | null,
): MealCell {
  return { title: entry.title, recipeId: entry.recipeId, recipeTitle: entry.recipeId ? recipeTitle : null };
}

type WeekEntry = { dayOffset: number; slot: string; title: string; recipeId: string | null };

/** Seven days, each with all four slots (null when empty). */
export function toWeek(
  sunday: CalendarDate,
  planId: string | null,
  entries: WeekEntry[],
  recipeTitles: Map<string, string>,
) {
  const days = Array.from({ length: 7 }, (_, offset) => {
    const meals = Object.fromEntries(MEAL_SLOTS.map((slot) => [slot, null])) as Record<MealSlot, MealCell | null>;
    for (const entry of entries) {
      if (entry.dayOffset !== offset) continue;
      if (!(MEAL_SLOTS as readonly string[]).includes(entry.slot)) continue;
      meals[entry.slot as MealSlot] = toMealCell(entry, entry.recipeId ? (recipeTitles.get(entry.recipeId) ?? null) : null);
    }
    return { date: formatCalendarDate(addCalendarDays(sunday, offset)), meals };
  });
  return { weekOf: formatCalendarDate(sunday), planId, days };
}

type Suggestion = { line: string; name: string; status: "missing" | "in-pantry" | "on-list" };

/**
 * Collapse suggestions into the week's needs, deduped by lower-cased name.
 * `linesByRecipe` says which recipes carry each ingredient line, so a missing
 * name can say where it came from (identical lines in two recipes list both).
 */
export function toGroceryNeeds(
  suggestions: Suggestion[],
  linesByRecipe: { recipeId: string; lines: string[] }[],
) {
  const sources = (line: string) => linesByRecipe.filter((r) => r.lines.includes(line)).map((r) => r.recipeId);
  const missing = new Map<string, { name: string; from: { recipeId: string; line: string }[] }>();
  const onList = new Map<string, string>();
  const have = new Map<string, string>();
  for (const s of suggestions) {
    const key = s.name.toLowerCase();
    if (s.status === "missing") {
      const entry = missing.get(key) ?? { name: s.name, from: [] };
      for (const recipeId of sources(s.line)) {
        if (!entry.from.some((f) => f.recipeId === recipeId && f.line === s.line)) {
          entry.from.push({ recipeId, line: s.line });
        }
      }
      missing.set(key, entry);
    } else if (s.status === "on-list") {
      if (!onList.has(key)) onList.set(key, s.name);
    } else if (!have.has(key)) {
      have.set(key, s.name);
    }
  }
  return {
    missing: [...missing.values()],
    onList: [...onList.values()],
    have: [...have.values()],
  };
}
