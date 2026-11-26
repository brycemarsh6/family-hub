// The AI usage meter's rules, as pure code (mission 89, family copies PR 5):
// which feature a call belongs to, what a call costs, which month it counts
// toward, and whether a copy may make the next call. No database, no
// environment reads: `src/lib/aiMeter.ts` feeds these the real values.
//
// Money is kept in micro-dollars (millionths of a dollar, 1 cent = 10,000) so
// the stored numbers are whole and add up exactly.

import {
  zoneMidnightInstant,
  calendarDateInZone,
  startOfMonth,
  type CalendarDate,
} from "./householdDate";

/** Every place the app calls Anthropic. A usage row stores one of these. */
export const AI_FEATURES = [
  "recipe-text",
  "recipe-photos",
  "ingredient-sort",
  "nutrition",
  "meal-ideas",
  "voice",
] as const;

export type AiFeature = (typeof AI_FEATURES)[number];

export const MICRO_USD_PER_CENT = 10_000;

/**
 * Prices in nano-dollars per token (whole numbers, so no rounding drift).
 * That equals dollars per million tokens times 1,000. Source: claude-api
 * skill, cached 2026-11-03. Thinking is billed inside `output`.
 */
type ModelPrice = { input: number; output: number; cacheRead: number; cacheWrite: number };

const SONNET_5_5: ModelPrice = { input: 2_000, output: 10_000, cacheRead: 100, cacheWrite: 2_500 };
const OPUS_5_5: ModelPrice = { input: 4_000, output: 20_000, cacheRead: 200, cacheWrite: 5_000 };
const HAIKU_5_5: ModelPrice = { input: 100, output: 500, cacheRead: 10, cacheWrite: 125 };

const PRICE_BY_MODEL_PREFIX: ReadonlyArray<readonly [string, ModelPrice]> = [
  ["claude-sonnet-5-5", SONNET_5_5],
  ["claude-opus-5-5", OPUS_5_5],
  ["claude-haiku-5-5", HAIKU_5_5],
];

/**
 * Fable 5.1 and Fable 5 are the most expensive models in the price table
 * ($10 in, $50 out; cache at the usual 0.1x read and 1.25x write). Nothing
 * here calls them; this row exists only as the price of an unknown model.
 */
const MOST_EXPENSIVE_MODEL_PRICE: ModelPrice = { input: 10_000, output: 50_000, cacheRead: 1_000, cacheWrite: 12_500 };

/** An unknown model is priced as the most expensive model there is, so the meter never under-counts. */
const UNKNOWN_MODEL_PRICE = MOST_EXPENSIVE_MODEL_PRICE;

function priceForModel(model: string): ModelPrice {
  const row = PRICE_BY_MODEL_PREFIX.find(([prefix]) => model.startsWith(prefix));
  return row ? row[1] : UNKNOWN_MODEL_PRICE;
}

/** The token counts on an Anthropic response's `usage`. */
export type AiTokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

/** One call's cost in micro-dollars: all tokens times their prices, rounded up once. */
export function costMicroUsd(model: string, usage: AiTokenUsage): number {
  const price = priceForModel(model);
  const nano =
    usage.input_tokens * price.input +
    usage.output_tokens * price.output +
    (usage.cache_read_input_tokens ?? 0) * price.cacheRead +
    (usage.cache_creation_input_tokens ?? 0) * price.cacheWrite;
  return Math.ceil(nano / 1000);
}

/**
 * The household's calendar month around `now`: `start` is midnight on day 1 in
 * `timeZone`, `end` is midnight on day 1 of the next month, `resetsOn` is that
 * next day 1 as a calendar date.
 */
export function aiMonthWindow(
  now: Date,
  timeZone: string,
): { start: Date; end: Date; resetsOn: CalendarDate } {
  const first = startOfMonth(calendarDateInZone(now, timeZone));
  const resetsOn: CalendarDate =
    first.month === 12
      ? { year: first.year + 1, month: 1, day: 1 }
      : { year: first.year, month: first.month + 1, day: 1 };
  return {
    start: zoneMidnightInstant(first, timeZone),
    end: zoneMidnightInstant(resetsOn, timeZone),
    resetsOn,
  };
}

/** `AI_ALLOWANCE_CENTS`: a whole number of cents. Missing, blank, negative or not a whole number means 0 (AI locked). */
export function parseAllowanceCents(value: string | undefined | null): number {
  if (value == null) return 0;
  const text = value.trim();
  if (!/^\d+$/.test(text)) return 0;
  const cents = Number(text);
  return Number.isSafeInteger(cents) ? cents : 0;
}

/** `STRIPE_PAYMENT_LINK_URL`: only an `https://` URL that parses, else null (no Upgrade button). */
export function parseUpgradeUrl(value: string | undefined | null): string | null {
  if (value == null) return null;
  const text = value.trim();
  if (!text.startsWith("https://")) return null;
  try {
    new URL(text);
    return text;
  } catch {
    return null;
  }
}

export type AiAccess = "allow" | "locked" | "used-up";

/** Why a call is refused: every `AiAccess` except "allow". */
export type AiBlockReason = Exclude<AiAccess, "allow">;

/** May this copy make an AI call now? The owner's copy always may; a relative's needs an allowance with room left. */
export function aiAccess(input: {
  isOwner: boolean;
  allowanceCents: number;
  usedMicroUsd: number;
}): AiAccess {
  if (input.isOwner) return "allow";
  if (input.allowanceCents <= 0) return "locked";
  if (input.usedMicroUsd >= input.allowanceCents * MICRO_USD_PER_CENT) return "used-up";
  return "allow";
}

/** Whole percent of the allowance spent (0 to 100, rounded down). 100 only when used up; 0 when there is no allowance. */
export function percentUsed(usedMicroUsd: number, allowanceCents: number): number {
  if (allowanceCents <= 0) return 0;
  const allowance = allowanceCents * MICRO_USD_PER_CENT;
  if (usedMicroUsd >= allowance) return 100;
  return Math.min(99, Math.floor((Math.max(0, usedMicroUsd) * 100) / allowance));
}
