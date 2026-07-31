// Starter data, so the app has something in it while we build.
//
// Run with:  npm run db:seed
//
// It clears both tables first, so running it twice won't create duplicates.
// Uses relative imports (not the "@/" shortcut) because this script is run
// directly by tsx, outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const db = new PrismaClient({ adapter });

const pantryItems = [
  // Pantry — a couple deliberately low so the "Low" badge has something to show
  { name: "Olive oil", location: "Pantry", quantity: 1, unit: "bottle", category: "Pantry", lowThreshold: 1 },
  { name: "Black beans", location: "Pantry", quantity: 4, unit: "cans", category: "Pantry", lowThreshold: 2 },
  { name: "Spaghetti", location: "Pantry", quantity: 2, unit: "boxes", category: "Pantry", lowThreshold: 2 },
  { name: "Peanut butter", location: "Pantry", quantity: 3, unit: "jars", category: "Pantry", lowThreshold: 1 },
  { name: "Rice", location: "Pantry", quantity: 5, unit: "lbs", category: "Pantry", lowThreshold: 2 },

  // Fridge
  { name: "Milk", location: "Fridge", quantity: 1, unit: "gal", category: "Dairy", lowThreshold: 1 },
  { name: "Eggs", location: "Fridge", quantity: 18, unit: "", category: "Dairy", lowThreshold: 6 },
  { name: "Cheddar cheese", location: "Fridge", quantity: 2, unit: "blocks", category: "Dairy", lowThreshold: 1 },
  { name: "Baby carrots", location: "Fridge", quantity: 2, unit: "bags", category: "Produce", lowThreshold: 1 },
  { name: "Orange juice", location: "Fridge", quantity: 1, unit: "carton", category: "Beverages", lowThreshold: 1 },

  // Freezer
  { name: "Chicken breasts", location: "Freezer", quantity: 6, unit: "lbs", category: "Meat & Seafood", lowThreshold: 2 },
  { name: "Frozen peas", location: "Freezer", quantity: 3, unit: "bags", category: "Frozen", lowThreshold: 1 },
  { name: "Ice cream", location: "Freezer", quantity: 1, unit: "tub", category: "Frozen", lowThreshold: 1 },

  // Storage — the overflow/cold storage downstairs
  { name: "Paper towels", location: "Storage", quantity: 8, unit: "rolls", category: "Household", lowThreshold: 4 },
  { name: "Toilet paper", location: "Storage", quantity: 12, unit: "rolls", category: "Household", lowThreshold: 6 },
  { name: "Canned tomatoes", location: "Storage", quantity: 2, unit: "cans", category: "Pantry", lowThreshold: 4 },
  { name: "Bottled water", location: "Storage", quantity: 1, unit: "case", category: "Beverages", lowThreshold: 2 },
];

const groceryItems = [
  { name: "Bananas", quantity: 1, unit: "bunch", category: "Produce" },
  { name: "Spinach", quantity: 1, unit: "bag", category: "Produce" },
  { name: "Greek yogurt", quantity: 4, unit: "cups", category: "Dairy" },
  { name: "Ground beef", quantity: 2, unit: "lbs", category: "Meat & Seafood" },
  { name: "Sourdough loaf", quantity: 1, unit: "", category: "Bakery" },
  { name: "Coffee beans", quantity: 1, unit: "bag", category: "Beverages" },
  { name: "Dish soap", quantity: 1, unit: "", category: "Household" },
  { name: "Tortillas", quantity: 2, unit: "packs", category: "Pantry" },
  { name: "Apples", quantity: 6, unit: "", category: "Produce", checked: true },
  { name: "Butter", quantity: 1, unit: "lb", category: "Dairy", checked: true },
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
