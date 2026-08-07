// Finds inventory rows that are probably the same thing twice, and items
// parked in the "Other" location/category that are waiting to be filed.
//
// This is deliberately NOT matchItem (src/lib/match.ts), and the difference
// is the consumer. Put-away's review sheet can afford loose suggestions —
// a human is already looking at that exact item and glances past a bad
// one. The review queue these detectors feed *pulses at the user
// unprompted*, so a hit has to be almost always right or the icon becomes
// noise and gets ignored. Third instance of the different-consumer,
// different-strictness lesson (see shelfLife.ts's findOverride).
//
// Like match.ts, no "server-only" guard and no app imports beyond the
// shared tokenizer: pure string/set comparison, so it can run in a plain
// script against the real inventory — which is exactly how it was tuned
// (see the D1 coverage notes in CLAUDE.md).

import { tokens } from "./match";

/** The fields the detectors need — a subset of PantryItem. */
export type DuplicateCandidate = {
  id: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
  unit: string | null;
};

export type DuplicatePair = {
  /**
   * "same-name": identical normalized names in the SAME location — two
   * rows that should almost certainly be one. (Identical names in
   * different locations are deliberately never flagged: the house really
   * does keep peanut butter and black beans in two places.)
   *
   * "subset-name": every word of one name appears in the other ("Ground
   * beef" ⊂ "Ground beef 80/20") — probably the same thing entered twice
   * with different wording. Suggestion only; a human decides.
   */
  kind: "same-name" | "subset-name";
  a: DuplicateCandidate;
  b: DuplicateCandidate;
  /** Order-independent and stable across runs — what a dismissal is
   * keyed on, so "these are different things" sticks forever. */
  fingerprint: string;
};

export type ParkedInOther = {
  kind: "other-location" | "other-category";
  item: DuplicateCandidate;
  fingerprint: string;
};

/** One normalized key per name: tokenized, lowercased, singularized, so
 * "Hot Dogs" and "hot dog" agree. */
function nameKey(item: DuplicateCandidate): string {
  return tokens(item.name).join(" ");
}

function pairFingerprint(kind: string, a: string, b: string): string {
  return `${kind}:${[a, b].sort().join(":")}`;
}

/** True when every token of `inner` appears in `outer`, and `outer` has at
 * least one token more — a proper subset, as sets. Equal token sets are
 * the same-name detector's business (or legitimate, across locations). */
function isProperTokenSubset(inner: string[], outer: string[]): boolean {
  if (inner.length === 0) return false;
  const outerSet = new Set(outer);
  if (!inner.every((t) => outerSet.has(t))) return false;
  return new Set(inner).size < outerSet.size;
}

/**
 * Leftovers are excluded from pair detection entirely: they're freeform
 * dish names ("Lasagna", "Taco meat") where overlapping words are normal
 * and merging two different days' leftovers would be wrong more often
 * than right.
 */
function pairEligible(item: DuplicateCandidate): boolean {
  return item.category !== "Leftovers";
}

/** Detector 1: identical normalized name, identical location. */
export function findSameNamePairs(
  items: readonly DuplicateCandidate[],
): DuplicatePair[] {
  const byKey = new Map<string, DuplicateCandidate[]>();
  for (const item of items) {
    if (!pairEligible(item)) continue;
    const key = `${nameKey(item)}|${item.location}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(item);
    else byKey.set(key, [item]);
  }

  const pairs: DuplicatePair[] = [];
  for (const bucket of byKey.values()) {
    // Every pair within a bucket, so three copies produce three pairs —
    // resolving any one re-runs the detector against fresh data anyway.
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        pairs.push({
          kind: "same-name",
          a: bucket[i],
          b: bucket[j],
          fingerprint: pairFingerprint("same-name", bucket[i].id, bucket[j].id),
        });
      }
    }
  }
  return pairs;
}

/**
 * Detector 2: proper token-subset pairs, e.g. "Ground beef" ⊂ "Ground
 * beef 80/20".
 *
 * Two precision guards, both validated by the D1 coverage run against
 * the real 477-item inventory (see CLAUDE.md for the hit-by-hit
 * findings). Unguarded, this detector fired 107 times; guarded, 21 —
 * and the 86 excluded pairs were noise, not missed duplicates:
 *
 * - The shorter name needs 2+ tokens. Single-word names subset-match
 *   nearly everything: in the real data, "Salt" paired with seven other
 *   salts, "Sugar" with eight sugary products ("Brown sugar", "Root
 *   Beer Zero Sugar"…), "Corn" with corn dogs, Corn Flakes, and corn
 *   syrup. Different products, not duplicates.
 * - Same location only. Across locations, a subset pair is the
 *   deliberate two-places pattern — canned "Black beans" in Pantry vs
 *   "Dry black beans" in Storage, "Chicken stock" open in the Fridge vs
 *   Kirkland cartons in the Pantry. The peanut-butter rule, just
 *   fuzzier.
 */
export function findSubsetNamePairs(
  items: readonly DuplicateCandidate[],
): DuplicatePair[] {
  const eligible = items.filter(pairEligible).map((item) => ({
    item,
    tokens: tokens(item.name),
  }));

  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const A = eligible[i];
      const B = eligible[j];
      if (A.item.location !== B.item.location) continue;

      const [inner, outer] =
        A.tokens.length <= B.tokens.length ? [A, B] : [B, A];
      if (inner.tokens.length < 2) continue;
      if (!isProperTokenSubset(inner.tokens, outer.tokens)) continue;

      pairs.push({
        kind: "subset-name",
        a: inner.item,
        b: outer.item,
        fingerprint: pairFingerprint("subset-name", A.item.id, B.item.id),
      });
    }
  }
  return pairs;
}

/** Detector 3: parked in the "Other" location or category — the honest
 * defaults P1 of the Put-away plan introduced, waiting to be filed. */
export function findParkedInOther(
  items: readonly DuplicateCandidate[],
): ParkedInOther[] {
  const parked: ParkedInOther[] = [];
  for (const item of items) {
    if (item.location === "Other") {
      parked.push({
        kind: "other-location",
        item,
        fingerprint: `other-location:${item.id}`,
      });
    }
    // An item can be parked both ways; report each separately, since they
    // resolve separately (pick a location vs pick a category).
    if (item.category === "Other") {
      parked.push({
        kind: "other-category",
        item,
        fingerprint: `other-category:${item.id}`,
      });
    }
  }
  return parked;
}

export type DuplicateMatchKind =
  | "exact-same-location"
  | "exact-other-location"
  | "subset-name";

export type DuplicateMatch = {
  kind: DuplicateMatchKind;
  item: DuplicateCandidate;
};

/** At most this many subset-name suggestions — same reasoning as
 * MAX_SUGGESTIONS in the put-away review action: a quick glance, not
 * another list to read. */
const MAX_ADD_TIME_SUGGESTIONS = 3;

/**
 * The add-time question, not the standing-queue question: does a
 * not-yet-created item probably already exist? Ranked so exact matches
 * always come first — an exact name match is unambiguous, so if there is
 * one, subset-name suggestions would only be noise and are skipped
 * entirely.
 *
 * Location matters here in a way it doesn't for the pair detectors:
 * "exact-same-location" is very likely "I forgot I had this" or "let me
 * just add more" — the review sheet pre-selects it. "exact-other-location"
 * is very likely the household's own legitimate two-places pattern (a
 * second jar of peanut butter downstairs) — it's shown, but never
 * pre-selected, so a deliberate choice to create separately isn't second-
 * guessed by default. Same distinction the pair detectors make, just
 * applied to a single candidate instead of two existing rows.
 */
export function findDuplicateMatches(
  candidateName: string,
  candidateLocation: string,
  existing: readonly DuplicateCandidate[],
): DuplicateMatch[] {
  const candidateTokens = tokens(candidateName);
  if (candidateTokens.length === 0) return [];
  const candidateKey = candidateTokens.join(" ");

  const exact: DuplicateMatch[] = [];
  for (const item of existing) {
    if (item.category === "Leftovers") continue;
    if (nameKey(item) !== candidateKey) continue;
    exact.push({
      kind: item.location === candidateLocation ? "exact-same-location" : "exact-other-location",
      item,
    });
  }

  if (exact.length > 0) {
    // Same-location first: that's the one worth pre-selecting.
    return exact.sort((a, b) =>
      a.kind === b.kind ? 0 : a.kind === "exact-same-location" ? -1 : 1,
    );
  }

  // No exact match — try subset-name, same location only (mirrors
  // findSubsetNamePairs' own guard, and for the same reason: a
  // cross-location subset pair is usually the deliberate two-places
  // pattern too, just fuzzier than an exact name).
  const subset: DuplicateMatch[] = [];
  for (const item of existing) {
    if (item.category === "Leftovers") continue;
    if (item.location !== candidateLocation) continue;
    const itemTokens = tokens(item.name);
    const [inner, outer] =
      candidateTokens.length <= itemTokens.length
        ? [candidateTokens, itemTokens]
        : [itemTokens, candidateTokens];
    if (inner.length < 2) continue;
    if (!isProperTokenSubset(inner, outer)) continue;
    subset.push({ kind: "subset-name", item });
  }

  return subset.slice(0, MAX_ADD_TIME_SUGGESTIONS);
}

export type IrregularityReport = {
  sameName: DuplicatePair[];
  subsetName: DuplicatePair[];
  parked: ParkedInOther[];
};

/** Everything the review queue shows, in one pass. Dismissal filtering is
 * the caller's job — these are pure detectors. */
export function findIrregularities(
  items: readonly DuplicateCandidate[],
): IrregularityReport {
  return {
    sameName: findSameNamePairs(items),
    subsetName: findSubsetNamePairs(items),
    parked: findParkedInOther(items),
  };
}

export type ReviewQueue = {
  pairs: DuplicatePair[];
  parked: ParkedInOther[];
  total: number;
};

/**
 * Detectors + dismissal filtering, over data the caller already holds.
 *
 * Lives here rather than in the Server Action so the Inventory page can
 * build its queue from the pantry rows it has *already* fetched, instead
 * of paying a second round trip to re-read all of them. That mattered
 * more than it looks: the app's functions and its database sit in
 * different regions, so every avoidable query is a cross-country hop.
 * The action still exists for re-reads after a decision, where the
 * client genuinely has no data of its own.
 */
export function buildReviewQueue(
  items: readonly DuplicateCandidate[],
  dismissedFingerprints: ReadonlySet<string>,
): ReviewQueue {
  const report = findIrregularities(items);

  const pairs = [...report.sameName, ...report.subsetName].filter(
    (pair) => !dismissedFingerprints.has(pair.fingerprint),
  );
  const parked = report.parked.filter(
    (entry) => !dismissedFingerprints.has(entry.fingerprint),
  );

  return { pairs, parked, total: pairs.length + parked.length };
}
