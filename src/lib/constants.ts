// The shared vocabulary of the app: the categories an item can belong to and
// the places food can be stored.
//
// These live in ONE place so that adding (say) a new storage location is a
// one-line change that every dropdown, filter and heading picks up automatically.
//
// Note these are plain TypeScript lists, not database enums. The database just
// stores text. TypeScript is what stops us writing "Freezor" by mistake.

export const CATEGORIES = [
  { name: "Produce", emoji: "🥬" },
  { name: "Dairy", emoji: "🥛" },
  { name: "Meat & Seafood", emoji: "🥩" },
  { name: "Bakery", emoji: "🍞" },
  { name: "Frozen", emoji: "🧊" },
  { name: "Pantry", emoji: "🥫" },
  { name: "Beverages", emoji: "🧃" },
  { name: "Household", emoji: "🧻" },
  { name: "Other", emoji: "🛒" },
] as const;

// `(typeof CATEGORIES)[number]["name"]` reads as: "the type of the `name` field
// of any item in CATEGORIES". So Category is exactly
// "Produce" | "Dairy" | ... | "Other" — derived from the list above rather than
// typed out twice, so the two can never drift apart.
export type Category = (typeof CATEGORIES)[number]["name"];

export const CATEGORY_NAMES: readonly Category[] = CATEGORIES.map((c) => c.name);

export const DEFAULT_CATEGORY: Category = "Other";

export const LOCATIONS = [
  { name: "Pantry", emoji: "🥫" },
  { name: "Fridge", emoji: "❄️" },
  { name: "Freezer", emoji: "🧊" },
  // Overflow / cold storage downstairs.
  { name: "Storage", emoji: "📦" },
] as const;

export type Location = (typeof LOCATIONS)[number]["name"];

export const LOCATION_NAMES: readonly Location[] = LOCATIONS.map((l) => l.name);

export const DEFAULT_LOCATION: Location = "Pantry";

/** Look up a category's emoji, falling back to the generic one. */
export function categoryEmoji(name: string): string {
  return CATEGORIES.find((c) => c.name === name)?.emoji ?? "🛒";
}

/** Look up a location's emoji, falling back to the generic one. */
export function locationEmoji(name: string): string {
  return LOCATIONS.find((l) => l.name === name)?.emoji ?? "📦";
}

/**
 * Where a category sorts in the list. Unknown categories (e.g. old data from
 * before a category was renamed) sort to the end rather than crashing.
 */
export function categoryOrder(name: string): number {
  const index = CATEGORIES.findIndex((c) => c.name === name);
  return index === -1 ? CATEGORIES.length : index;
}

export function locationOrder(name: string): number {
  const index = LOCATIONS.findIndex((l) => l.name === name);
  return index === -1 ? LOCATIONS.length : index;
}

/** Narrow arbitrary text (e.g. from a form) to a Category we actually support. */
export function toCategory(value: unknown): Category {
  return CATEGORY_NAMES.includes(value as Category)
    ? (value as Category)
    : DEFAULT_CATEGORY;
}

/** Narrow arbitrary text (e.g. from a form) to a Location we actually support. */
export function toLocation(value: unknown): Location {
  return LOCATION_NAMES.includes(value as Location)
    ? (value as Location)
    : DEFAULT_LOCATION;
}

/** An item counts as "running low" when there's no more than the threshold left. */
export function isLow(quantity: number, lowThreshold: number): boolean {
  return quantity <= lowThreshold;
}
