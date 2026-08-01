import {
  Carrot,
  Croissant,
  Milk,
  Egg,
  Beef,
  Fish,
  Snowflake,
  Container,
  Soup,
  Droplet,
  Sandwich,
  Amphora,
  Leaf,
  Cake,
  Candy,
  Wheat,
  Bean,
  Utensils,
  Popcorn,
  Cookie,
  Nut,
  IceCreamCone,
  CupSoda,
  SprayCan,
  Sparkles,
  Pill,
  Baby,
  ShoppingBag,
  Package,
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

// The order here is a walk through a supermarket — perimeter first (produce,
// bakery, dairy, meat), then the frozen aisle, then the centre aisles, then
// non-food, with the catch-all last. The Shopping list groups by this order so
// it reads in roughly the order you'd actually collect things, and Inventory
// uses the same order for its collapsible group headers.
//
// These came from a reference app's taxonomy, flattened from its two levels
// (group > category) down to just the groups. The finer level had ~91 entries
// — far too many for a dropdown on a phone, and more precision than a family
// needs. Adding one back later is a one-line change.
export const CATEGORIES = [
  // Perimeter
  { name: "Produce", icon: Carrot },
  { name: "Bread & Bakery", icon: Croissant },
  { name: "Dairy Products", icon: Milk },
  { name: "Eggs", icon: Egg },
  { name: "Meat", icon: Beef },
  { name: "Seafood", icon: Fish },
  { name: "Meals & Frozen Food", icon: Snowflake },
  // Centre aisles
  { name: "Canned Food", icon: Container },
  { name: "Soups & Stocks", icon: Soup },
  // Pickles live here too — the name says so on purpose, so nobody has to
  // guess whether they're Produce or Canned Food.
  { name: "Condiments & Sauces", icon: Droplet },
  { name: "Dips & Spreads", icon: Sandwich },
  { name: "Oil & Vinegar", icon: Amphora },
  { name: "Spices", icon: Leaf },
  { name: "Baking", icon: Cake },
  { name: "Sweeteners & Preserves", icon: Candy },
  { name: "Grains", icon: Wheat },
  { name: "Legumes", icon: Bean },
  { name: "Noodles", icon: Utensils },
  { name: "Cereals", icon: Popcorn },
  { name: "Snacks", icon: Cookie },
  { name: "Nut & Seeds", icon: Nut },
  { name: "Sweets & Desserts", icon: IceCreamCone },
  { name: "Beverages", icon: CupSoda },
  // Non-food
  { name: "Household", icon: SprayCan },
  { name: "Personal Care & Beauty", icon: Sparkles },
  { name: "Health & Wellness", icon: Pill },
  { name: "Children's Essentials", icon: Baby },
  // Catch-all — anything that doesn't fit, and the fallback for old data
  // whose category no longer exists.
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
