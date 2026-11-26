// Every word the AI usage meter shows (mission 89), in one place. Pure: no
// database, no environment. The Settings card, the blocked message and the
// forms all read from here.

import { FULL_MONTH_NAMES } from "./mealPlanDates";
import { MICRO_USD_PER_CENT, type AiFeature } from "./aiMeterPolicy";
import type { CalendarDate } from "./householdDate";

export const AI_CARD_TITLE = "AI features";

export const AI_UPGRADE_BUTTON = "Upgrade";

/** "December 1": the day the allowance resets. */
export function resetsLabel(date: CalendarDate): string {
  return `${FULL_MONTH_NAMES[date.month - 1]} ${date.day}`;
}

/** A relative's copy, normal state. Percent, never dollars. */
export function aiUsedPercentText(percent: number, resetsOn: CalendarDate): string {
  return `${percent}% of this month's AI used. Resets ${resetsLabel(resetsOn)}.`;
}

export function aiUsedUpText(resetsOn: CalendarDate): string {
  return `All of this month's AI is used. Resets ${resetsLabel(resetsOn)}.`;
}

/** A copy with no allowance. */
export const AI_LOCKED_TEXT =
  "Recipe import from photos and links, meal ideas and nutrition estimates come with the AI upgrade.";

/** "$1.42": micro-dollars rounded to the nearest cent. */
export function formatUsd(microUsd: number): string {
  const cents = Math.round(microUsd / MICRO_USD_PER_CENT);
  const dollars = Math.floor(cents / 100);
  return `$${dollars}.${String(cents % 100).padStart(2, "0")}`;
}

/** Bryce's copy: dollars, request count, no limit. */
export function aiOwnerText(usedMicroUsd: number, requests: number): string {
  const noun = requests === 1 ? "request" : "requests";
  return `${formatUsd(usedMicroUsd)} used this month, ${requests} ${noun}. No limit on your copy.`;
}

/** The blocked message that replaces an AI result. */
export const AI_BLOCKED_TITLE = "This month's AI allowance is used up.";

export function aiBlockedResetsText(resetsOn: CalendarDate): string {
  return aiBlockedResetsLine(resetsLabel(resetsOn));
}

/** The same line from an already-made label ("December 1"), for the screens. */
export function aiBlockedResetsLine(label: string): string {
  return `It resets ${label}. Everything else in Marshee still works.`;
}

/** For people who cannot upgrade (not an admin). */
export const AI_ASK_ADMIN_TEXT = "Ask an admin about the AI upgrade";

/** Owner per-feature labels. The two recipe import features share one line. */
export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  "recipe-text": "Recipe import",
  "recipe-photos": "Recipe import",
  "ingredient-sort": "Grocery sort",
  nutrition: "Nutrition",
  "meal-ideas": "Meal ideas",
  voice: "Voice",
};
