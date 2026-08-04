import { tokens } from "@/lib/match";
import type { Category, Location } from "@/lib/constants";

// How long something keeps, estimated — the whole point of the Expiring page.
//
// Nobody is going to hand-type an expiry date for 461 items, so every item
// gets a guess unless it has a real date. Precedence, in order:
//
//   1. An exact date the user typed in (handled by the caller — see
//      estimateExpiryDate below — this file only produces the estimate half).
//   2. A NAME_OVERRIDES entry — the item's own name matched a specific food
//      ("grapes", "milk", "ground beef") with numbers pulled from USDA/FDA
//      guidance, not invented.
//   3. CATEGORY_LOCATION_FALLBACK — a generic number for the item's category
//      and location ("Produce in Fridge ≈ 1 week") when no specific food
//      matched.
//   4. Nothing. Some things (spices, salt) don't meaningfully expire on any
//      timescale this page cares about, and get no estimate at all.
//
// Every number here is a rough middle-of-the-range guess, not a guarantee —
// see the `~` the UI puts on estimates. Sources: USDA FoodKeeper guidance,
// FDA cold storage charts, and USDA FSIS freezer-time guidance, gathered
// 2026-08 and cross-checked against multiple summaries rather than one.

type ShelfLifeEntry = {
  /** What this is matched against, via the same fuzzy matcher voice/search use. */
  name: string;
  fridgeDays?: number;
  freezerDays?: number;
  /** Also used for Storage — the overflow room isn't meaningfully different. */
  pantryDays?: number;
};

// Ordered specific-to-general on purpose: "hard-boiled egg" has to be checked
// before the bare "egg" entry, or the (much longer) shell-egg number would
// win for both. matchItem scores whole-word overlap, so the more specific
// entries naturally outscore the general ones anyway — the ordering here is
// for a human reading this list, not load-bearing for the matching itself.
const NAME_OVERRIDES: ShelfLifeEntry[] = [
  // Produce — USDA FoodKeeper / FDA fridge guidance.
  { name: "grapes", fridgeDays: 7 },
  { name: "strawberries", fridgeDays: 5 },
  { name: "frozen strawberries", freezerDays: 240 },
  { name: "apples", fridgeDays: 21 },
  { name: "bananas", pantryDays: 6 },
  { name: "bell peppers", fridgeDays: 10 },
  { name: "carrots", fridgeDays: 21 },
  { name: "baby carrot sticks", fridgeDays: 14 },
  { name: "lemons", fridgeDays: 21 },
  { name: "limes", fridgeDays: 21 },
  { name: "watermelon", fridgeDays: 7 }, // cut-vs-whole is unknowable from the name; splits the difference
  { name: "kiwis", pantryDays: 7 },

  // Dairy & eggs.
  { name: "milk", fridgeDays: 7 }, // opened; USDA FoodKeeper
  { name: "almond milk", fridgeDays: 7 },
  { name: "soy milk", pantryDays: 180 }, // shelf-stable carton until opened
  { name: "heavy whipping cream", fridgeDays: 10 },
  { name: "eggs", fridgeDays: 28 }, // shell eggs, 3-5 weeks
  { name: "hard-boiled eggs", fridgeDays: 7 }, // much shorter than shell eggs — checked first
  { name: "butter", fridgeDays: 60 },
  { name: "yogurt pouches", fridgeDays: 10 },
  { name: "grated parmesan", fridgeDays: 21 },
  { name: "shredded mozzarella", fridgeDays: 14 },
  { name: "string cheese", fridgeDays: 21 },
  { name: "cheddar cheese", fridgeDays: 21 },
  { name: "monterey jack cheese", fridgeDays: 21 },
  { name: "pepper jack cheese", fridgeDays: 21 },

  // Meat, poultry, seafood — USDA FSIS freezer-quality guidance.
  { name: "ground beef", freezerDays: 120 },
  { name: "bone-in ribeye steaks", freezerDays: 270 },
  { name: "t-bone steaks", freezerDays: 270 },
  { name: "beef sirloin steaks", freezerDays: 270 },
  { name: "beef tenderloin steaks", freezerDays: 270 },
  { name: "beef chuck roasts", freezerDays: 365 },
  { name: "beef cross rib roast", freezerDays: 365 },
  { name: "beef round bone roast", freezerDays: 365 },
  { name: "beef sirloin tip roast", freezerDays: 365 },
  { name: "frozen beef patties", freezerDays: 120 },
  { name: "boneless skinless chicken breasts", freezerDays: 270 },
  { name: "boneless skinless chicken thighs", freezerDays: 270 },
  { name: "boneless skinless chicken tenderloins", freezerDays: 270 },
  { name: "bacon", freezerDays: 30 },
  { name: "hot dogs", fridgeDays: 7 }, // this house keeps them in the fridge, opened
  { name: "deli ham", fridgeDays: 4 },
  { name: "deli chicken breast", fridgeDays: 4 },
  { name: "cooked and peeled shrimp", freezerDays: 120 },
  { name: "frozen cubed ham", freezerDays: 120 },
  { name: "kirkland meatballs", freezerDays: 120 },

  // Bread — different clocks depending on where it's stored.
  { name: "white bread", pantryDays: 7 },
  { name: "rustic italian loaf", freezerDays: 90 },
  { name: "texas toast", freezerDays: 90 },
  { name: "mission carb balance tortillas", fridgeDays: 21 },
  { name: "tortillaland tortillas", fridgeDays: 21 },

  // Condiments — huge range, because acid/salt/sugar content is what
  // actually determines this, not the container. Ranch and fresh salsa spoil
  // like dairy/produce; hot sauce and soy sauce barely spoil at all.
  { name: "real mayonnaise", fridgeDays: 60 },
  { name: "light mayonnaise", fridgeDays: 60 },
  { name: "tomato ketchup", fridgeDays: 180 },
  { name: "fresh salsa", fridgeDays: 7 },
  { name: "wild coyote ranch", fridgeDays: 21 },
  { name: "hidden valley ranch", fridgeDays: 21 },
  { name: "kinders barbecue sauce", fridgeDays: 120 },
  { name: "craigs original barbecue sauce", fridgeDays: 120 },
];

// Generic backstop when nothing specific matched — deliberately conservative
// (shorter rather than longer) for anything perishable, since the cost of a
// too-short estimate is "you checked it a bit early", and the cost of a
// too-long one is the exact problem this page exists to prevent.
//
// Missing an entry for a category+location combo is fine — it just means
// that combo gets no estimate at all (falls through to `null`), which is
// correct for things like Spices/Pantry that don't meaningfully expire.
const CATEGORY_LOCATION_FALLBACK: Partial<
  Record<Category, Partial<Record<Location, number>>>
> = {
  Produce: { Fridge: 7, Pantry: 5, Storage: 5 },
  "Bread & Bakery": { Pantry: 5, Fridge: 10, Freezer: 90 },
  "Dairy Products": { Fridge: 10, Freezer: 60, Pantry: 180, Storage: 180 },
  Eggs: { Fridge: 21, Freezer: 90 },
  Meat: { Fridge: 3, Freezer: 180 },
  Seafood: { Fridge: 2, Freezer: 120 },
  "Meals & Frozen Food": { Freezer: 120, Fridge: 3 },
  "Condiments & Sauces": { Fridge: 60, Pantry: 365 },
  "Dips & Spreads": { Fridge: 14 },
  "Soups & Stocks": { Fridge: 4, Freezer: 90, Pantry: 365, Storage: 365 },
  "Sweeteners & Preserves": { Fridge: 180, Pantry: 365 },
  "Canned Food": { Pantry: 730, Storage: 730 },
  Legumes: { Pantry: 730, Storage: 730 },
};

/**
 * Find the override entry an item's name refers to, or none.
 *
 * Deliberately stricter than voice/search matching (matchItem), and does
 * NOT reuse it. Voice can afford a confident best guess because the app says
 * what it picked out loud and "undo" is one word away — a shelf-life
 * estimate has no such feedback loop, so a wrong guess just silently
 * mislabels something. "Dr Pepper Zero" partial-matched "Bell peppers" on
 * the shared word "pepper" under matchItem's scoring; here, every word of
 * the override has to appear in the item's name, not just one.
 *
 * Among entries that fully match, the one with the most words wins, so
 * "Hard-boiled eggs" (an item) prefers the "hard-boiled eggs" override over
 * the shorter, much-longer-lasting "eggs" override.
 */
function findOverride(itemName: string): ShelfLifeEntry | null {
  const itemTokens = tokens(itemName);
  let best: ShelfLifeEntry | null = null;
  let bestSpecificity = 0;

  for (const entry of NAME_OVERRIDES) {
    const entryTokens = tokens(entry.name);
    const fullyCovered = entryTokens.every((t) => itemTokens.includes(t));
    if (fullyCovered && entryTokens.length > bestSpecificity) {
      best = entry;
      bestSpecificity = entryTokens.length;
    }
  }

  return best;
}

/**
 * How many days something keeps, from whichever clock applies — or `null`
 * when nothing in the tables covers it (fine: not everything expires on a
 * timescale worth showing on this page).
 */
export function estimateShelfLifeDays(item: {
  name: string;
  category: Category;
  location: Location;
}): number | null {
  const dayFor = (entry: ShelfLifeEntry): number | undefined => {
    if (item.location === "Fridge") return entry.fridgeDays;
    if (item.location === "Freezer") return entry.freezerDays;
    return entry.pantryDays; // Pantry and Storage share the same clock
  };

  const entry = findOverride(item.name);
  if (entry) {
    const days = dayFor(entry);
    if (days !== undefined) return days;
  }

  return CATEGORY_LOCATION_FALLBACK[item.category]?.[item.location] ?? null;
}

/**
 * The date an item is estimated to expire, or `null` if nothing applies.
 *
 * Counts from `restockedAt`, not `createdAt` — see the schema comment on
 * PantryItem.restockedAt for why: every imported item shares one creation
 * date, but restockedAt moves forward every time the item is actually
 * topped up, so the estimate self-corrects as the house shops.
 */
export function estimateExpiryDate(item: {
  name: string;
  category: Category;
  location: Location;
  restockedAt: Date;
}): Date | null {
  const days = estimateShelfLifeDays(item);
  if (days === null) return null;
  const date = new Date(item.restockedAt);
  date.setDate(date.getDate() + days);
  return date;
}
