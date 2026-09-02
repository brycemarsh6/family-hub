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
  CircleDashed,
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
  // Where a newly-created inventory item lands when nobody said where it
  // actually goes — see DEFAULT_LOCATION below for why "Pantry" used to be
  // that default and stopped being honest. Deliberately named the same as
  // the "Other" *category* even though they mean different things — see
  // the "Put-away review plan" section of CLAUDE.md for why that naming
  // collision was kept rather than renamed to something like "Unsorted".
  // CircleDashed (not Package/Refrigerator/Snowflake/Archive's filled-object
  // style) reads as "not yet filed" rather than a real fifth place in the
  // house.
  { name: "Other", icon: CircleDashed },
] as const;

export type Location = (typeof LOCATIONS)[number]["name"];

export const LOCATION_NAMES: readonly Location[] = LOCATIONS.map((l) => l.name);

// Was "Pantry" — silently claiming every newly-created item was on the
// pantry shelf, which was a guess dressed up as a fact (a bought item put
// away without ever having existed in the inventory has no evidence of
// where it actually lives). "Other" is honest, and it's findable: it gets
// its own Inventory filter chip, so mis-filed items surface instead of
// hiding among real pantry stock. Read by both commitPutAway
// (groceries.ts) and voice's apply.ts, so this one line fixes both paths.
export const DEFAULT_LOCATION: Location = "Other";

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

// Family Accounts v1 (see .avengers/plans/family-accounts-v1.md). "admin" and
// "parent" can manage the household (users, settings, deleting things);
// "kid" can view and participate but not manage; "device" is the wall
// tablet, signed in as its own real person rather than as a flag on someone
// else's session — see User's own doc comment in schema.prisma for why.
export const ROLES = ["admin", "parent", "kid", "device"] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "kid";

/** Roles allowed to manage the household — users, settings, deleting things. */
export const MANAGER_ROLES: readonly Role[] = ["admin", "parent"];

/** Narrow arbitrary text (e.g. from a form) to a Role we actually support. */
export function toRole(value: unknown): Role {
  return ROLES.includes(value as Role) ? (value as Role) : DEFAULT_ROLE;
}

/** A human label for each role — "Parent", not "parent". Used anywhere a
 * role is shown to a person rather than stored: the account menu, Settings,
 * and Manage Family's person list and per-person sheets. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  parent: "Parent",
  kid: "Kid",
  device: "Device",
};

/**
 * Roles an admin can hand out through the Manage Family UI. Device mode
 * (the wall tablet, role "device") is created and managed through its own
 * Phase 4 flow, not this one — the same restriction
 * prisma/bootstrap-users.ts already applies to interactive person creation
 * (see its own PERSON_ROLES). Excluding it here means neither the create
 * nor the role-change UI can ever accidentally spin up, or promote someone
 * into, a device-role user — and the server-side actions narrow to this
 * same list, so it's never just a UI nicety.
 */
export const ASSIGNABLE_ROLES: readonly Role[] = ROLES.filter((role) => role !== "device");

// A fixed data palette for avatar initials — the same reasoning as the
// nutrition donut's fixed orange/blue/purple (src/app/kitchen/cooking/
// recipes/[id]/NutritionSection.tsx): these name arbitrary *people*, not UI
// roles, so they don't belong with the job-based CSS tokens in globals.css
// (--surface, --danger, etc). Chosen as mid-tone hex values so white text
// stays legible on top of them in both the light and dark themes — no
// separate light/dark variant needed, unlike the job tokens.
//
// Shaped like CATEGORIES/LOCATIONS above (a stable `name` plus its display
// data) rather than a bare list of hex strings, and for the same reason a
// User row stores a category *name* rather than an icon reference: what's
// persisted on a `User` row (see avatarColor's doc comment in
// schema.prisma) is the swatch's `name`, not its `hex`. If the palette is
// ever retuned — darkening a hue for dark-mode contrast, say — every
// existing row still points at a name that's still in the list; storing
// the hex directly would strand every existing person on a color that no
// longer exists the moment the palette changes.
//
// Retuned for the Marshee brand (2026-08-31). These used to be the stock
// vivid web colors (#2563eb, #dc2626, ...), which read as loud and generic
// against the app's sage-and-cream palette. Each is now warmer and less
// saturated, in the same family as its own name.
//
// Two hard constraints, both measured rather than eyeballed, because
// retuning by taste alone is how the previous set went wrong:
//   1. White text must clear WCAG AA (4.5:1) on every swatch. The OLD set
//      genuinely failed this on three colors — green was 3.30:1, amber
//      3.19:1, teal 3.74:1 — even though the comment above claimed white
//      stayed legible on all of them. Every swatch below is 4.6:1 or
//      better.
//   2. They must stay tellable apart at a glance, since that's the entire
//      job of an avatar color. Minimum pairwise perceptual distance is
//      ΔE 23 (closest: blue/teal), comfortably above the ~10 where colors
//      start getting confused.
// Re-check both if any value here is ever changed.
export const AVATAR_COLORS = [
  { name: "blue", hex: "#41708c" },
  { name: "red", hex: "#a6432f" },
  { name: "green", hex: "#5c7a42" },
  { name: "amber", hex: "#9a6b1a" },
  { name: "purple", hex: "#6e5478" },
  { name: "teal", hex: "#2f6f68" },
  { name: "pink", hex: "#a04e68" },
  { name: "slate", hex: "#5e5952" },
] as const;

// `(typeof AVATAR_COLORS)[number]["name"]` — the same derivation pattern as
// `Category`/`Location` above, so AvatarColor is exactly
// "blue" | "red" | ... | "slate", never typed out twice.
export type AvatarColor = (typeof AVATAR_COLORS)[number]["name"];

export const AVATAR_COLOR_NAMES: readonly AvatarColor[] = AVATAR_COLORS.map((c) => c.name);

/** Look up a swatch's hex value, falling back to the first swatch. */
export function avatarColorHex(name: string): string {
  return AVATAR_COLORS.find((c) => c.name === name)?.hex ?? AVATAR_COLORS[0].hex;
}

/** Narrow arbitrary text (e.g. from a form) to an AvatarColor we actually support. */
export function toAvatarColor(value: unknown): AvatarColor {
  return AVATAR_COLOR_NAMES.includes(value as AvatarColor)
    ? (value as AvatarColor)
    : AVATAR_COLOR_NAMES[0];
}

// Calendar v1 (.avengers/plans/calendar-v1.md). One household constant
// rather than a per-user timezone column: every family member sharing one
// house is presumed to share one clock, and there's no UI anywhere in this
// app yet for someone to set their own. If the household ever spans two
// timezones (a college kid, a trip), this becomes a column read per-user —
// a one-line schema change, not a redesign, since every call site already
// takes a timezone as a value rather than hardcoding "Denver" inline.
export const HOUSEHOLD_TIME_ZONE = "America/Denver";
