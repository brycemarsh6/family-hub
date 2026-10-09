import "server-only";

// The one definition of every pantry write — pulled out of
// `actions/pantry.ts` (mission-21/C4) because the Assistant API is about to be
// a SECOND caller, and a Route Handler with no session can't call a
// `"use server"` action (nor may lib import from `actions/`). Same shape as
// `voice/apply.ts` / `calendarEventQuery.ts`: a `server-only` lib module with
// NO auth check of its own. Each caller carries its own gate — the Server
// Actions call `getVerifiedSession()`, the assistant routes carry the bearer
// token — and `revalidatePath` stays in the actions (STRUCTURE.md: route
// strings never live in lib).
//
// Every function returns the row it wrote (or null when the row is missing)
// so a caller can serialize it or record it in an audit log. Input
// *normalization* (trim, round to 2dp, clamp, vocabulary guards) lives here
// so both callers get identical rows; *rejection* of bad input (empty name,
// non-positive merge quantity) stays with the caller, as it always was.

import { db } from "@/lib/db";
import { toCategory, toLocation } from "@/lib/constants";
import { findDuplicateMatches, type DuplicateMatch } from "@/lib/duplicates";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The single "restockedAt only when quantity rises" rule.
 *
 * Tapping + is "I just got more of this" — the Expiring page's shelf-life
 * clock (see src/lib/shelfLife.ts) counts from here, not from when the row
 * was first created. Tapping − is using what's already there, so it doesn't
 * reset anything. Spread into a Prisma `data` object.
 */
function restockedIfRose(before: number, after: number) {
  return after > before ? { restockedAt: new Date() } : {};
}

export async function createPantryItem(fields: {
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  location: string;
}) {
  return db.pantryItem.create({
    data: {
      name: fields.name.trim(),
      quantity: Math.max(0, fields.quantity),
      unit: fields.unit?.trim() || null,
      category: toCategory(fields.category),
      location: toLocation(fields.location),
    },
  });
}

/**
 * Absolute quantity set (the stepper). Zero is meaningful here ("we're
 * out"), so unlike the grocery list we allow it — we just don't allow
 * negatives. Null when the row doesn't exist.
 */
export async function setPantryQuantity(id: string, quantity: number) {
  const safeQuantity = Math.max(0, round2(quantity));

  const current = await db.pantryItem.findUnique({
    where: { id },
    select: { quantity: true },
  });
  if (!current) return null;

  const row = await db.pantryItem.update({
    where: { id },
    data: {
      quantity: safeQuantity,
      ...restockedIfRose(current.quantity, safeQuantity),
    },
  });
  return { before: current.quantity, after: row.quantity, row };
}

/** Relative change: floor 0, 2dp, restockedAt on increase. Null if missing. */
export async function adjustPantryQuantity(id: string, delta: number) {
  const current = await db.pantryItem.findUnique({
    where: { id },
    select: { quantity: true },
  });
  if (!current) return null;
  return setPantryQuantity(id, current.quantity + delta);
}

/**
 * Edit any subset of fields. The edit sheet's Server Action passes every
 * field (a full replace, so behaviour there is unchanged); the API may pass
 * a partial patch — an omitted field is left untouched. `expiresAt: null`
 * clears the date, `undefined` leaves it. A name that trims to empty is
 * ignored rather than written; callers reject it up front. Null if missing.
 */
export async function editPantryItem(
  id: string,
  changes: {
    name?: string;
    quantity?: number;
    unit?: string | null;
    category?: string;
    location?: string;
    lowThreshold?: number;
    expiresAt?: Date | null;
  },
) {
  const current = await db.pantryItem.findUnique({
    where: { id },
    select: { quantity: true },
  });
  if (!current) return null;

  const name = changes.name?.trim();
  const quantity =
    changes.quantity === undefined
      ? undefined
      : Math.max(0, round2(changes.quantity));

  return db.pantryItem.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(quantity !== undefined ? { quantity } : {}),
      ...(changes.unit !== undefined
        ? { unit: changes.unit?.trim() || null }
        : {}),
      ...(changes.category !== undefined
        ? { category: toCategory(changes.category) }
        : {}),
      ...(changes.location !== undefined
        ? { location: toLocation(changes.location) }
        : {}),
      ...(changes.lowThreshold !== undefined
        ? { lowThreshold: Math.max(0, round2(changes.lowThreshold)) }
        : {}),
      ...(changes.expiresAt !== undefined
        ? { expiresAt: changes.expiresAt }
        : {}),
      // Same "went up = restocked" rule as the quantity stepper.
      ...(quantity !== undefined ? restockedIfRose(current.quantity, quantity) : {}),
    },
  });
}

/**
 * "That's the same thing": adds quantity only — deliberately doesn't touch
 * the target's own category or location, the same restraint commitPutAway's
 * merge path uses and for the same reason: "this is the same item" is a
 * different claim than "also re-file it." Throws Prisma P2025 if the row is
 * gone (as the action always did). Callers reject a non-positive quantity.
 */
export async function mergeIntoPantryItem(id: string, quantity: number) {
  return db.pantryItem.update({
    where: { id },
    data: {
      quantity: { increment: round2(quantity) },
      restockedAt: new Date(),
    },
  });
}

/**
 * Log a leftover: name, how many portions, how many days it's good for.
 *
 * "Days good" converts to a real `expiresAt` at local midnight N days out,
 * the same convention the edit sheet's date field uses — so a logged
 * leftover and a hand-typed date behave identically downstream. "Local" here
 * is the *server's* clock, which is what the in-app action has always used;
 * a caller with no browser behind it (the Assistant API) passes an explicit
 * `expiresAt` — a household-midnight instant — instead of inheriting the
 * server's zone.
 */
export async function logLeftover(input: {
  name: string;
  quantity: number;
  daysGood: number;
  expiresAt?: Date;
}) {
  const quantity = Math.max(0.5, round2(input.quantity));

  let expiresAt = input.expiresAt;
  if (!expiresAt) {
    const days = Math.max(1, Math.round(input.daysGood));
    const today = new Date();
    expiresAt = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + days,
    );
  }

  return db.pantryItem.create({
    data: {
      name: input.name.trim(),
      quantity,
      category: "Leftovers",
      location: "Fridge", // freezing a leftover is an edit away, via the same date field
      expiresAt,
      lowThreshold: 0, // "running low" isn't a meaningful state for a one-off leftover
    },
  });
}

/**
 * Read-only: does a not-yet-created item probably already exist? See
 * findDuplicateMatches in duplicates.ts for how exact-same-location,
 * exact-other-location, and subset-name matches are ranked.
 */
export async function findDuplicateCandidates(
  name: string,
  location: string,
): Promise<DuplicateMatch[]> {
  const trimmed = name.trim();
  if (!trimmed) return [];

  const existing = await db.pantryItem.findMany({
    select: {
      id: true,
      name: true,
      location: true,
      category: true,
      quantity: true,
      unit: true,
    },
  });

  return findDuplicateMatches(trimmed, toLocation(location), existing);
}
