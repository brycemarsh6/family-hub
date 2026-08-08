// Best-effort parsing of Recipe.prepTime/cookTime into a rough time bucket
// for the C4 filter bar. These fields are deliberately free text ("6-8",
// "45 min", "a while" are all real answers nobody wants forced into a
// number field — see the Recipes v2 plan), so this is accepted as fuzzy by
// design: anything that doesn't parse simply matches no bucket, rather than
// being coerced into a guess. That's not a bug to fix later.

export type TimeBucket = "under30" | "30to60" | "over60";

const FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75 };

// Captures an optional whole number, an optional fraction glyph, then the
// unit word — so "1½ hours", "1 hour", and "½ hr" all match the same
// pattern with different pieces present.
const HOUR_PATTERN = /(\d+)?\s*(½|¼|¾)?\s*(hours?|hrs?|h)\b/i;
const MINUTE_PATTERN = /(\d+)\s*(minutes?|mins?|m)\b/i;

/**
 * Turn one free-text duration ("1 hr 15 min", "45 min", "a while") into a
 * whole number of minutes, or null when nothing recognizable is there.
 * Exported mainly so the unit tests can exercise it directly; callers
 * outside this file should generally want totalTimeBucket instead.
 */
export function parseTimeToMinutes(text: string): number | null {
  let minutes = 0;
  let matched = false;

  const hourMatch = text.match(HOUR_PATTERN);
  if (hourMatch && (hourMatch[1] || hourMatch[2])) {
    const whole = hourMatch[1] ? parseInt(hourMatch[1], 10) : 0;
    const fraction = hourMatch[2] ? FRACTIONS[hourMatch[2]] : 0;
    minutes += (whole + fraction) * 60;
    matched = true;
  }

  const minuteMatch = text.match(MINUTE_PATTERN);
  if (minuteMatch) {
    minutes += parseInt(minuteMatch[1], 10);
    matched = true;
  }

  return matched ? Math.round(minutes) : null;
}

/**
 * The Total Time filter's bucket for a recipe: prep + cook, summed from
 * whichever of the two fields parse. Null when *neither* field parses —
 * the recipe just doesn't show up under any Total Time chip, which is the
 * accepted fuzziness rather than a guess dressed up as a fact.
 */
export function totalTimeBucket(
  prepTime: string | null,
  cookTime: string | null,
): TimeBucket | null {
  const prepMinutes = prepTime ? parseTimeToMinutes(prepTime) : null;
  const cookMinutes = cookTime ? parseTimeToMinutes(cookTime) : null;
  if (prepMinutes === null && cookMinutes === null) return null;

  const total = (prepMinutes ?? 0) + (cookMinutes ?? 0);
  if (total < 30) return "under30";
  if (total <= 60) return "30to60";
  return "over60";
}

export const TIME_BUCKET_LABELS: Record<TimeBucket, string> = {
  under30: "Under 30",
  "30to60": "30–60",
  over60: "Over an hour",
};
