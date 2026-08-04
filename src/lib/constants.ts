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
  UtensilsCrossed,
  ShoppingBag,
  Package,
  Refrigerator,
  Archive,
  Store as StoreIcon,
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
  // Not really a "walk through the supermarket" category — nobody buys
  // leftovers — but it lives here anyway, right after the closest neighbor
  // conceptually (prepared food), because the whole point of E3 was NOT
  // building a parallel leftovers system: one line here, and leftovers
  // inherit every pantry feature (rows, steppers, search, the edit sheet,
  // the Expiring page) for free. See CLAUDE.md's Expiring & leftovers plan.
  { name: "Leftovers", icon: UtensilsCrossed },
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

// Where a shopping-list item gets bought. Unlike categories and locations,
// these are brands, so there's no per-store icon to use — Lucide has no
// Walmart or Costco logo, and the "outline icons only, no emoji" rule rules
// out the alternatives. Stores render as plain text chips instead, with one
// shared storefront icon standing for the concept.
//
// A store lives on the grocery item only, and disappears when the item is
// bought: "Put away" deletes the grocery row once it's been added back into
// the inventory.
export const STORES = [
  "Walmart",
  "Costco",
  "Amazon",
  "Target",
  "Maceys",
  "Other",
] as const;

export type Store = (typeof STORES)[number];

/** The icon standing for the *concept* of a store — not for any one shop. */
export const STORE_ICON = StoreIcon;

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

/**
 * Narrow arbitrary text to a Store, or `null` if it isn't one. Unlike
 * category and location, store has no default to fall back to — "no store
 * chosen yet" is a real, valid state (e.g. items added before this feature
 * existed), not an error to paper over with a guess.
 */
export function toStore(value: unknown): Store | null {
  return STORES.includes(value as Store) ? (value as Store) : null;
}

/** An item counts as "running low" when there's no more than the threshold left. */
export function isLow(quantity: number, lowThreshold: number): boolean {
  return quantity <= lowThreshold;
}

// The four slots a day of the Meal Plan can hold. Order here is display
// order — a day card lists Breakfast, Lunch, Dinner, Snacks top to bottom.
export const MEAL_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number];

/** Narrow arbitrary text (e.g. from a form) to a MealSlot we actually support. */
export function toMealSlot(value: unknown): MealSlot | null {
  return MEAL_SLOTS.includes(value as MealSlot) ? (value as MealSlot) : null;
}
