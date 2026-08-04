// Matches a spoken or typed item name against what's actually in the pantry.
//
// One matcher, two callers: `matchItem` (whole-word, for voice — see
// src/lib/voice/apply.ts) and `searchItems` (prefix-tolerant, for the
// Inventory search box). Sharing the tokenizer means a fix to one benefits
// both, and both get checked against the same real inventory.
//
// Deliberately has no "server-only" guard and no imports: it's pure string
// comparison, which means it can be run directly against the real inventory in
// a plain script. Given what fuzzy matching gets wrong, being able to check it
// against 461 real item names is worth more than the import restriction.
//
// The 461-item import taught this lesson the hard way: plain substring
// matching silently files "steaks" under a rule meant for "tea", because "tea"
// really is inside "steaks". Everything here compares whole words, and every
// candidate is scored rather than accepted on first hit, so a near-miss loses
// to a better match instead of winning by being checked first.

export type Candidate = { id: string; name: string };

export type MatchResult = {
  match: Candidate | null;
  /** Other plausible rows, best first — used to say "did you mean". */
  alternatives: Candidate[];
  /**
   * True when the runner-up scored just as well, so the pick was arbitrary.
   *
   * This is common and real: the house has seven kinds of milk and no plain
   * "Milk", and several items (peanut butter, black beans) exist twice in
   * different locations. The caller says which one it chose out loud so a
   * wrong guess is caught immediately rather than discovered as a bad count.
   */
  ambiguous: boolean;
};

/** Lowercase, strip punctuation, collapse spaces. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Crude singular form. Deliberately conservative — it only strips endings that
 * are almost always plural, because turning "grass" into "gras" would cost more
 * than leaving a plural alone.
 */
function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ses") || word.endsWith("xes") || word.endsWith("zes")) {
    return word.slice(0, -2);
  }
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokens(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean).map(singular);
}

/**
 * How well a spoken phrase matches one pantry item, 0 (no match) upward.
 *
 * Scoring, rather than a first-hit rule, is what lets "milk" prefer "Whole
 * milk" over "Nonfat dry milk" — both contain the word, so the tiebreak is how
 * much of the candidate is *not* the thing that was said.
 */
function score(spoken: string[], candidate: string): number {
  const candidateTokens = tokens(candidate);
  if (spoken.length === 0 || candidateTokens.length === 0) return 0;

  // "hotdog" said as one word should still match "Hot dogs" — compare the
  // space-free forms too, so spacing differences don't sink an obvious match.
  const spokenJoined = spoken.join("");
  const candidateJoined = candidateTokens.join("");
  if (spokenJoined === candidateJoined) return 1000;

  const overlap = spoken.filter((t) => candidateTokens.includes(t)).length;
  if (overlap === 0) {
    // Last resort: one is a prefix of the other ("pepper" / "peppercorn").
    return candidateJoined.startsWith(spokenJoined) ||
      spokenJoined.startsWith(candidateJoined)
      ? 1
      : 0;
  }

  // Every spoken word found, in order, is a strong signal. Then subtract for
  // extra words in the candidate, so the tightest match wins.
  const allFound = overlap === spoken.length;
  const extra = candidateTokens.length - overlap;
  return (allFound ? 100 : 10 * overlap) - extra;
}

/**
 * Find the pantry item a spoken phrase refers to.
 *
 * Returns `null` rather than guessing when nothing scores above the floor —
 * the caller says "I couldn't find that" out loud, which is a far better
 * outcome than silently decrementing the wrong item.
 */
export function matchItem(
  spokenName: string,
  candidates: Candidate[],
): MatchResult {
  const spoken = tokens(spokenName);
  if (spoken.length === 0) {
    return { match: null, alternatives: [], ambiguous: false };
  }

  const scored = candidates
    .map((c) => ({ candidate: c, value: score(spoken, c.name) }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  if (scored.length === 0) {
    return { match: null, alternatives: [], ambiguous: false };
  }

  return {
    match: scored[0].candidate,
    alternatives: scored.slice(1, 4).map((s) => s.candidate),
    ambiguous: scored.length > 1 && scored[1].value === scored[0].value,
  };
}

/**
 * How well one typed word matches one candidate word.
 *
 * Voice gets whole words ("strawberries"); someone typing wants results
 * before they finish the word ("straw"). An exact hit outranks a prefix hit,
 * and a longer typed prefix outranks a shorter one — typing "strawb" should
 * feel more confident than "s" — but this is still whole-word-aware: "hot"
 * does not match "shot" just because both start with letters in common.
 */
function tokenMatchValue(queryToken: string, candidateToken: string): number {
  if (queryToken === candidateToken) return 100;
  if (candidateToken.startsWith(queryToken)) {
    return 60 + Math.min(30, queryToken.length * 3);
  }
  // Rare, but real: someone types a fuller word than a short candidate token
  // ("appl" vs "AP"). Guarded to length 3+ — without it, "T-bone steaks"
  // tokenizes to ["t", "bone", "steak"], and that lone "t" would match any
  // query starting with T, pulling steaks into a search for "tortilla".
  if (candidateToken.length >= 3 && queryToken.startsWith(candidateToken)) {
    return 10;
  }
  return 0;
}

/**
 * Score a typed query against one candidate name.
 *
 * Every query word has to match *something* in the candidate — searching
 * "hot dog" should not surface "Corn dog" just because "dog" matches, the
 * same way word-boundary matching keeps voice from confusing "steaks" and
 * "tea". Extra candidate words beyond what was typed still cost a little, so
 * "Strawberries" edges out "Frozen strawberries" for the query "straw".
 */
function searchScore(queryTokens: string[], candidateTokens: string[]): number {
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;

  let total = 0;
  for (const q of queryTokens) {
    let best = 0;
    for (const c of candidateTokens) {
      best = Math.max(best, tokenMatchValue(q, c));
    }
    if (best === 0) return 0;
    total += best;
  }

  const extra = Math.max(0, candidateTokens.length - queryTokens.length);
  return total - extra * 2;
}

/**
 * Rank a list of pantry/grocery items against a typed search query.
 *
 * Returns the matching items, best match first, with no ranking value
 * attached — callers just want the reordered list. An empty or
 * whitespace-only query returns an empty array rather than everything, since
 * the caller is expected to show the normal grouped view until there's
 * something to search for (see PantryList.tsx).
 */
export function searchItems<T extends { name: string }>(
  query: string,
  items: readonly T[],
): T[] {
  const queryTokens = tokens(query);
  if (queryTokens.length === 0) return [];

  return items
    .map((item) => ({ item, value: searchScore(queryTokens, tokens(item.name)) }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((s) => s.item);
}
