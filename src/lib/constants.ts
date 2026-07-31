import {
  Carrot,
  Milk,
  Beef,
  Croissant,
  Snowflake,
  Package,
  CupSoda,
  SprayCan,
  ShoppingBag,
  Refrigerator,
  Archive,
  type LucideIcon,
} from "lucide-react";

// The shared vocabulary of the app: the categories an item can belong to and
// the places food can be stored.
//
// These live in ONE place so that adding (say) a new storage location is a
// one-line change that every dropdown, filter and heading picks up automatically.
//
// Note these are plain TypeScript lists, not database enums. The database just
// stores text. TypeScript is what stops us writing "Freezor" by mistake.

export const CATEGORIES = [
  { name: "Produce", icon: Carrot },
  { name: "Dairy", icon: Milk },
  { name: "Meat & Seafood", icon: Beef },
  { name: "Bakery", icon: Croissant },
  { name: "Frozen", icon: Snowflake },
  { name: "Pantry", icon: Package },
  { name: "Beverages", icon: CupSoda },
  { name: "Household", icon: SprayCan },
  { name: "Other", icon: ShoppingBag },
] as const;

// `(typeof CATEGORIES)[number]["name"]` reads as: "the type of the `name` field
// of any item in CATEGORIES". So Category is exactly
// "Produce" | "Dairy" | ... | "Other" — derived from the list above rather than
// typed out twice, so the two can never drift apart.
export type Category = (typeof CATEGORIES)[number]["name"];

export const CATEGORY_NAMES: readonly Category[] = CATEGORIES.map((c) => c.name);

export const DEFAULT_CATEGORY: Category = "Other";

export const LOCATIONS = [
  { name: "Pantry", icon: Package },
  { name: "Fridge", icon: Refrigerator },
  { name: "Freezer", icon: Snowflake },
  // Overflow / cold storage downstairs.
  { name: "Storage", icon: Archive },
] as const;

export type Location = (typeof LOCATIONS)[number]["name"];

export const LOCATION_NAMES: readonly Location[] = LOCATIONS.map((l) => l.name);

export const DEFAULT_LOCATION: Location = "Pantry";

/** Look up a category's icon, falling back to the generic one. */
export function categoryIcon(name: string): LucideIcon {
  return CATEGORIES.find((c) => c.name === name)?.icon ?? ShoppingBag;
}

/** Look up a location's icon, falling back to the generic one. */
export function locationIcon(name: string): LucideIcon {
  return LOCATIONS.find((l) => l.name === name)?.icon ?? Archive;
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
