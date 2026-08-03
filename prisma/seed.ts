// Starter data, so the app has something in it while we build.
//
// Run with:  npm run db:seed
//
// It clears both tables first, so running it twice won't create duplicates.
// Uses relative imports (not the "@/" shortcut) because this script is run
// directly by tsx, outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
// `import type` is erased before this ever runs, so pulling the vocabulary in
// here costs nothing at runtime — tsx never loads constants.ts (and therefore
// never loads lucide-react, which has no business running in a Node script).
// What it buys us is that renaming a category in constants.ts now breaks this
// file at compile time, instead of silently leaving stale names in the seed.
import type { Category, Location, Store } from "../src/lib/constants";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type SeedPantryItem = {
  name: string;
  location: Location;
  quantity: number;
  unit: string;
  category: Category;
  lowThreshold: number;
};

type SeedGroceryItem = {
  name: string;
  quantity: number;
  unit: string;
  category: Category;
  checked?: boolean;
  /** Left undefined on a couple of items on purpose, to seed the
   * "added before this feature existed" / not-yet-assigned state. */
  store?: Store;
};

// A realistic household spread: every category except "Other" has something in
// it, and every location is used, so the filters and the collapsible group
// headers all have something to show. Items marked LOW sit at or below their
// threshold on purpose, so the Low badge and "Add N low items" button aren't
// theoretical.
const pantryItems: SeedPantryItem[] = [
  // ---- Pantry ----
  { name: "Olive oil", location: "Pantry", quantity: 1, unit: "bottle", category: "Oil & Vinegar", lowThreshold: 1 }, // LOW
  { name: "Vegetable oil", location: "Pantry", quantity: 2, unit: "bottles", category: "Oil & Vinegar", lowThreshold: 1 },
  { name: "Balsamic vinegar", location: "Pantry", quantity: 2, unit: "bottles", category: "Oil & Vinegar", lowThreshold: 1 },

  { name: "Spaghetti", location: "Pantry", quantity: 2, unit: "boxes", category: "Noodles", lowThreshold: 2 }, // LOW
  { name: "Penne", location: "Pantry", quantity: 3, unit: "boxes", category: "Noodles", lowThreshold: 2 },
  { name: "Egg noodles", location: "Pantry", quantity: 1, unit: "bag", category: "Noodles", lowThreshold: 1 }, // LOW

  { name: "Rice", location: "Pantry", quantity: 5, unit: "lbs", category: "Grains", lowThreshold: 2 },
  { name: "Quinoa", location: "Pantry", quantity: 2, unit: "lbs", category: "Grains", lowThreshold: 1 },
  { name: "Rolled oats", location: "Pantry", quantity: 1, unit: "canister", category: "Grains", lowThreshold: 1 }, // LOW

  { name: "Lentils", location: "Pantry", quantity: 2, unit: "lbs", category: "Legumes", lowThreshold: 1 },
  { name: "Dried black beans", location: "Pantry", quantity: 3, unit: "lbs", category: "Legumes", lowThreshold: 1 },

  { name: "Black beans", location: "Pantry", quantity: 4, unit: "cans", category: "Canned Food", lowThreshold: 2 },
  { name: "Canned corn", location: "Pantry", quantity: 5, unit: "cans", category: "Canned Food", lowThreshold: 2 },
  { name: "Tuna", location: "Pantry", quantity: 6, unit: "cans", category: "Canned Food", lowThreshold: 3 },

  { name: "Chicken broth", location: "Pantry", quantity: 4, unit: "cartons", category: "Soups & Stocks", lowThreshold: 2 },
  { name: "Tomato soup", location: "Pantry", quantity: 3, unit: "cans", category: "Soups & Stocks", lowThreshold: 2 },

  { name: "Ketchup", location: "Pantry", quantity: 1, unit: "bottle", category: "Condiments & Sauces", lowThreshold: 1 }, // LOW
  { name: "Mustard", location: "Pantry", quantity: 2, unit: "bottles", category: "Condiments & Sauces", lowThreshold: 1 },
  { name: "Soy sauce", location: "Pantry", quantity: 1, unit: "bottle", category: "Condiments & Sauces", lowThreshold: 1 }, // LOW
  { name: "Pasta sauce", location: "Pantry", quantity: 3, unit: "jars", category: "Condiments & Sauces", lowThreshold: 2 },
  { name: "Dill pickles", location: "Pantry", quantity: 2, unit: "jars", category: "Condiments & Sauces", lowThreshold: 1 },

  { name: "Peanut butter", location: "Pantry", quantity: 3, unit: "jars", category: "Dips & Spreads", lowThreshold: 1 },
  { name: "Salsa", location: "Pantry", quantity: 2, unit: "jars", category: "Dips & Spreads", lowThreshold: 1 },

  { name: "Honey", location: "Pantry", quantity: 1, unit: "jar", category: "Sweeteners & Preserves", lowThreshold: 1 }, // LOW
  { name: "Strawberry jam", location: "Pantry", quantity: 2, unit: "jars", category: "Sweeteners & Preserves", lowThreshold: 1 },
  { name: "Maple syrup", location: "Pantry", quantity: 1, unit: "bottle", category: "Sweeteners & Preserves", lowThreshold: 1 }, // LOW
  { name: "Granulated sugar", location: "Pantry", quantity: 4, unit: "lbs", category: "Sweeteners & Preserves", lowThreshold: 2 },

  { name: "All-purpose flour", location: "Pantry", quantity: 5, unit: "lbs", category: "Baking", lowThreshold: 2 },
  { name: "Baking powder", location: "Pantry", quantity: 1, unit: "container", category: "Baking", lowThreshold: 1 }, // LOW
  { name: "Vanilla extract", location: "Pantry", quantity: 1, unit: "bottle", category: "Baking", lowThreshold: 1 }, // LOW
  { name: "Chocolate chips", location: "Pantry", quantity: 2, unit: "bags", category: "Baking", lowThreshold: 1 },

  { name: "Salt", location: "Pantry", quantity: 2, unit: "containers", category: "Spices", lowThreshold: 1 },
  { name: "Black pepper", location: "Pantry", quantity: 1, unit: "grinder", category: "Spices", lowThreshold: 1 }, // LOW
  { name: "Cinnamon", location: "Pantry", quantity: 1, unit: "jar", category: "Spices", lowThreshold: 1 }, // LOW
  { name: "Garlic powder", location: "Pantry", quantity: 2, unit: "jars", category: "Spices", lowThreshold: 1 },

  { name: "Cheerios", location: "Pantry", quantity: 2, unit: "boxes", category: "Cereals", lowThreshold: 1 },
  { name: "Granola", location: "Pantry", quantity: 1, unit: "bag", category: "Cereals", lowThreshold: 1 }, // LOW

  { name: "Tortilla chips", location: "Pantry", quantity: 2, unit: "bags", category: "Snacks", lowThreshold: 1 },
  { name: "Crackers", location: "Pantry", quantity: 3, unit: "boxes", category: "Snacks", lowThreshold: 2 },
  { name: "Popcorn", location: "Pantry", quantity: 4, unit: "bags", category: "Snacks", lowThreshold: 2 },
  { name: "Granola bars", location: "Pantry", quantity: 12, unit: "bars", category: "Snacks", lowThreshold: 6 },

  { name: "Almonds", location: "Pantry", quantity: 2, unit: "bags", category: "Nut & Seeds", lowThreshold: 1 },
  { name: "Peanuts", location: "Pantry", quantity: 1, unit: "jar", category: "Nut & Seeds", lowThreshold: 1 }, // LOW

  { name: "Chocolate bars", location: "Pantry", quantity: 4, unit: "bars", category: "Sweets & Desserts", lowThreshold: 2 },

  { name: "Coffee beans", location: "Pantry", quantity: 1, unit: "bag", category: "Beverages", lowThreshold: 1 }, // LOW
  { name: "Tea bags", location: "Pantry", quantity: 40, unit: "bags", category: "Beverages", lowThreshold: 20 },

  { name: "Sourdough loaf", location: "Pantry", quantity: 1, unit: "", category: "Bread & Bakery", lowThreshold: 1 }, // LOW
  { name: "Bagels", location: "Pantry", quantity: 6, unit: "", category: "Bread & Bakery", lowThreshold: 3 },

  // ---- Fridge ----
  { name: "Milk", location: "Fridge", quantity: 1, unit: "gal", category: "Dairy Products", lowThreshold: 1 }, // LOW
  { name: "Cheddar cheese", location: "Fridge", quantity: 2, unit: "blocks", category: "Dairy Products", lowThreshold: 1 },
  { name: "Greek yogurt", location: "Fridge", quantity: 6, unit: "cups", category: "Dairy Products", lowThreshold: 3 },
  { name: "Butter", location: "Fridge", quantity: 2, unit: "lbs", category: "Dairy Products", lowThreshold: 1 },
  { name: "Sour cream", location: "Fridge", quantity: 1, unit: "tub", category: "Dairy Products", lowThreshold: 1 }, // LOW

  { name: "Eggs", location: "Fridge", quantity: 18, unit: "", category: "Eggs", lowThreshold: 6 },

  { name: "Baby carrots", location: "Fridge", quantity: 2, unit: "bags", category: "Produce", lowThreshold: 1 },
  { name: "Spinach", location: "Fridge", quantity: 1, unit: "bag", category: "Produce", lowThreshold: 1 }, // LOW
  { name: "Apples", location: "Fridge", quantity: 6, unit: "", category: "Produce", lowThreshold: 3 },
  { name: "Bananas", location: "Fridge", quantity: 4, unit: "", category: "Produce", lowThreshold: 2 },
  { name: "Bell peppers", location: "Fridge", quantity: 3, unit: "", category: "Produce", lowThreshold: 2 },

  { name: "Tortillas", location: "Fridge", quantity: 2, unit: "packs", category: "Bread & Bakery", lowThreshold: 1 },

  { name: "Deli turkey", location: "Fridge", quantity: 1, unit: "pack", category: "Meat", lowThreshold: 1 }, // LOW
  { name: "Bacon", location: "Fridge", quantity: 2, unit: "packs", category: "Meat", lowThreshold: 1 },

  { name: "Hummus", location: "Fridge", quantity: 1, unit: "tub", category: "Dips & Spreads", lowThreshold: 1 }, // LOW

  { name: "Orange juice", location: "Fridge", quantity: 1, unit: "carton", category: "Beverages", lowThreshold: 1 }, // LOW

  // ---- Freezer ----
  { name: "Chicken breasts", location: "Freezer", quantity: 6, unit: "lbs", category: "Meat", lowThreshold: 2 },
  { name: "Ground beef", location: "Freezer", quantity: 3, unit: "lbs", category: "Meat", lowThreshold: 2 },

  { name: "Salmon fillets", location: "Freezer", quantity: 4, unit: "fillets", category: "Seafood", lowThreshold: 2 },
  { name: "Shrimp", location: "Freezer", quantity: 1, unit: "bag", category: "Seafood", lowThreshold: 1 }, // LOW

  { name: "Frozen peas", location: "Freezer", quantity: 3, unit: "bags", category: "Meals & Frozen Food", lowThreshold: 1 },
  { name: "Frozen broccoli", location: "Freezer", quantity: 2, unit: "bags", category: "Meals & Frozen Food", lowThreshold: 1 },
  { name: "Frozen pizza", location: "Freezer", quantity: 2, unit: "", category: "Meals & Frozen Food", lowThreshold: 1 },
  { name: "Frozen waffles", location: "Freezer", quantity: 1, unit: "box", category: "Meals & Frozen Food", lowThreshold: 1 }, // LOW

  { name: "Ice cream", location: "Freezer", quantity: 1, unit: "tub", category: "Sweets & Desserts", lowThreshold: 1 }, // LOW

  // ---- Storage (overflow / cold storage downstairs) ----
  { name: "Paper towels", location: "Storage", quantity: 8, unit: "rolls", category: "Household", lowThreshold: 4 },
  { name: "Toilet paper", location: "Storage", quantity: 12, unit: "rolls", category: "Household", lowThreshold: 6 },
  { name: "Dish soap", location: "Storage", quantity: 2, unit: "bottles", category: "Household", lowThreshold: 1 },
  { name: "Laundry detergent", location: "Storage", quantity: 1, unit: "jug", category: "Household", lowThreshold: 1 }, // LOW
  { name: "Trash bags", location: "Storage", quantity: 2, unit: "boxes", category: "Household", lowThreshold: 1 },

  { name: "Bottled water", location: "Storage", quantity: 1, unit: "case", category: "Beverages", lowThreshold: 2 }, // LOW

  { name: "Shampoo", location: "Storage", quantity: 2, unit: "bottles", category: "Personal Care & Beauty", lowThreshold: 1 },
  { name: "Toothpaste", location: "Storage", quantity: 3, unit: "tubes", category: "Personal Care & Beauty", lowThreshold: 2 },
  { name: "Body wash", location: "Storage", quantity: 1, unit: "bottle", category: "Personal Care & Beauty", lowThreshold: 1 }, // LOW

  { name: "Ibuprofen", location: "Storage", quantity: 1, unit: "bottle", category: "Health & Wellness", lowThreshold: 1 }, // LOW
  { name: "Vitamins", location: "Storage", quantity: 2, unit: "bottles", category: "Health & Wellness", lowThreshold: 1 },
  { name: "Bandages", location: "Storage", quantity: 1, unit: "box", category: "Health & Wellness", lowThreshold: 1 }, // LOW

  { name: "Diapers", location: "Storage", quantity: 2, unit: "packs", category: "Children's Essentials", lowThreshold: 1 },
  { name: "Baby wipes", location: "Storage", quantity: 4, unit: "packs", category: "Children's Essentials", lowThreshold: 2 },
];

const groceryItems: SeedGroceryItem[] = [
  { name: "Bananas", quantity: 1, unit: "bunch", category: "Produce", store: "Walmart" },
  { name: "Spinach", quantity: 1, unit: "bag", category: "Produce", store: "Walmart" },
  { name: "Greek yogurt", quantity: 4, unit: "cups", category: "Dairy Products", store: "Costco" },
  { name: "Ground beef", quantity: 2, unit: "lbs", category: "Meat", store: "Costco" },
  // No store — proves the "not chosen yet" state for items added before, or
  // without going through, the store picker.
  { name: "Sourdough loaf", quantity: 1, unit: "", category: "Bread & Bakery" },
  { name: "Coffee beans", quantity: 1, unit: "bag", category: "Beverages", store: "Target" },
  { name: "Dish soap", quantity: 1, unit: "", category: "Household", store: "Amazon" },
  { name: "Tortillas", quantity: 2, unit: "packs", category: "Bread & Bakery", store: "Maceys" },
  { name: "Apples", quantity: 6, unit: "", category: "Produce", checked: true, store: "Walmart" },
  { name: "Butter", quantity: 1, unit: "lb", category: "Dairy Products", checked: true, store: "Costco" },
];

async function main() {
  // Delete groceries first: they point at pantry items, so they have to go first.
  await db.groceryItem.deleteMany();
  await db.pantryItem.deleteMany();

  await db.pantryItem.createMany({ data: pantryItems });
  await db.groceryItem.createMany({
    data: groceryItems.map((item) => ({
      ...item,
      checkedAt: item.checked ? new Date() : null,
    })),
  });

  const pantryCount = await db.pantryItem.count();
  const groceryCount = await db.groceryItem.count();
  console.log(`Seeded ${pantryCount} pantry items and ${groceryCount} grocery items.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
