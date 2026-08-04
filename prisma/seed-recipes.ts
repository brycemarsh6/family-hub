// Recipe-only test data, for exercising R1 (the alphabetized list, search
// later in R2, and the CRUD pages) without touching anything else.
//
// Run with:  npm run db:seed-recipes
// Clean up with:  npm run db:clean-recipes
//
// IMPORTANT: this only ever touches the Recipe table. Unlike prisma/seed.ts,
// it must NOT clear pantry or grocery data — the same Neon database backs
// both local dev and the live production app the family actually uses (see
// the Recipes plan in CLAUDE.md), and there is no separate dev database.
//
// Uses relative imports (not the "@/" shortcut) because this script is run
// directly by tsx, outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type SeedRecipe = {
  title: string;
  ingredients: string;
  steps: string;
  servings?: string;
  prepTime?: string;
  cookTime?: string;
};

// Spread across the alphabet, including one starting with a digit, so the
// A-Z jump rail (R2) has a real "#" bucket to test against — not just A-Z.
const recipes: SeedRecipe[] = [
  {
    title: "3-Ingredient Peanut Butter Cookies",
    ingredients: "1 cup peanut butter\n1 cup sugar\n1 egg",
    steps:
      "Heat oven to 350°F.\nMix all three ingredients until smooth.\nRoll into balls, place on a baking sheet, and press with a fork.\nBake 10 minutes, cool 5 minutes before moving.",
    servings: "18 cookies",
    prepTime: "10 min",
    cookTime: "10 min",
  },
  {
    title: "Apple Crisp",
    ingredients:
      "6 apples, peeled and sliced\n3/4 cup flour\n3/4 cup brown sugar\n1/2 cup rolled oats\n1/2 cup butter, softened\n1 tsp cinnamon",
    steps:
      "Heat oven to 350°F.\nSpread apples in a baking dish.\nMix flour, brown sugar, oats, and cinnamon; cut in butter until crumbly.\nSprinkle topping over apples.\nBake 45 minutes until golden and bubbling.",
    servings: "8",
    prepTime: "15 min",
    cookTime: "45 min",
  },
  {
    title: "Banana Bread",
    ingredients:
      "3 ripe bananas, mashed\n1/3 cup melted butter\n3/4 cup sugar\n1 egg\n1 tsp vanilla\n1 tsp baking soda\nPinch of salt\n1 1/2 cups flour",
    steps:
      "Heat oven to 350°F and grease a loaf pan.\nMix mashed bananas with melted butter.\nStir in sugar, egg, and vanilla.\nSprinkle baking soda and salt over the mix, then stir in flour.\nPour into the pan and bake 55-60 minutes.",
    servings: "1 loaf",
    prepTime: "10 min",
    cookTime: "1 hr",
  },
  {
    title: "Chocolate Chip Cookies",
    ingredients:
      "2 1/4 cups flour\n1 tsp baking soda\n1 tsp salt\n1 cup butter, softened\n3/4 cup sugar\n3/4 cup brown sugar\n2 eggs\n2 tsp vanilla\n2 cups chocolate chips",
    steps:
      "Heat oven to 375°F.\nCombine flour, baking soda, and salt.\nBeat butter with both sugars until creamy, then add eggs and vanilla.\nStir in the flour mixture, then the chocolate chips.\nDrop by rounded spoonfuls onto ungreased sheets.\nBake 9-11 minutes.",
    servings: "About 5 dozen",
    prepTime: "15 min",
    cookTime: "10 min",
  },
  {
    title: "Deviled Eggs",
    ingredients:
      "6 hard-boiled eggs\n1/4 cup mayonnaise\n1 tsp mustard\nSalt and pepper\nPaprika, for garnish",
    steps:
      "Halve the eggs and scoop yolks into a bowl.\nMash yolks with mayonnaise, mustard, salt, and pepper.\nSpoon or pipe filling back into the whites.\nSprinkle with paprika.",
    servings: "12 halves",
    prepTime: "15 min",
  },
  {
    title: "English Muffin Pizzas",
    ingredients:
      "4 English muffins, split\n1 cup pizza sauce\n2 cups shredded mozzarella\nToppings of choice",
    steps:
      "Heat oven to 400°F.\nToast muffin halves lightly.\nSpread sauce, add cheese and toppings.\nBake 8-10 minutes until cheese is melted and bubbly.",
    servings: "8 halves",
    prepTime: "10 min",
    cookTime: "10 min",
  },
  {
    title: "French Toast",
    ingredients:
      "4 eggs\n2/3 cup milk\n1 tsp cinnamon\n1 tsp vanilla\n8 slices bread\nButter, for the pan",
    steps:
      "Whisk eggs, milk, cinnamon, and vanilla together.\nDip each bread slice, coating both sides.\nCook in a buttered skillet over medium heat, 2-3 minutes per side.",
    servings: "4",
    prepTime: "10 min",
    cookTime: "15 min",
  },
  {
    title: "Garlic Butter Shrimp",
    ingredients:
      "1 lb shrimp, peeled and deveined\n4 tbsp butter\n4 cloves garlic, minced\nJuice of 1 lemon\nSalt, pepper, red pepper flakes\nParsley, chopped",
    steps:
      "Melt butter in a skillet over medium-high heat.\nAdd garlic and cook 30 seconds.\nAdd shrimp, season, and cook 2-3 minutes per side until pink.\nStir in lemon juice and parsley.",
    servings: "4",
    prepTime: "10 min",
    cookTime: "10 min",
  },
  {
    title: "Honey Mustard Chicken",
    ingredients:
      "4 chicken breasts\n1/4 cup honey\n1/4 cup Dijon mustard\n2 tbsp olive oil\nSalt and pepper",
    steps:
      "Heat oven to 375°F.\nWhisk honey, mustard, and olive oil together.\nSeason chicken and place in a baking dish, then coat with the sauce.\nBake 25-30 minutes until cooked through.",
    servings: "4",
    prepTime: "10 min",
    cookTime: "30 min",
  },
  {
    title: "Instant Pot Chili",
    ingredients:
      "1 lb ground beef\n1 onion, diced\n2 cans kidney beans, drained\n1 can diced tomatoes\n2 tbsp chili powder\n1 tsp cumin\nSalt and pepper",
    steps:
      "Brown beef and onion on Sauté.\nAdd remaining ingredients and stir.\nSeal and cook on High Pressure 15 minutes.\nLet pressure release naturally 10 minutes, then quick-release the rest.",
    servings: "6",
    prepTime: "10 min",
    cookTime: "25 min",
  },
  {
    title: "Jambalaya",
    ingredients:
      "1 lb andouille sausage, sliced\n1 lb chicken thighs, cubed\n1 onion, diced\n1 bell pepper, diced\n2 celery stalks, diced\n2 cups rice\n1 can diced tomatoes\n3 cups chicken broth\n2 tsp Cajun seasoning",
    steps:
      "Brown sausage and chicken in a large pot, then set aside.\nSauté onion, pepper, and celery until soft.\nStir in rice, tomatoes, broth, seasoning, and the meat.\nBring to a boil, cover, and simmer 20-25 minutes until rice is tender.",
    servings: "8",
    prepTime: "15 min",
    cookTime: "40 min",
  },
  {
    title: "Zucchini Bread",
    ingredients:
      "2 cups shredded zucchini\n3 eggs\n1 cup vegetable oil\n2 cups sugar\n1 tbsp vanilla\n3 cups flour\n1 tsp baking soda\n1 tsp baking powder\n1 tsp cinnamon",
    steps:
      "Heat oven to 325°F and grease two loaf pans.\nBeat eggs, oil, sugar, and vanilla together, then stir in zucchini.\nCombine dry ingredients separately, then fold into the wet mixture.\nDivide between pans and bake 50-60 minutes.",
    servings: "2 loaves",
    prepTime: "15 min",
    cookTime: "1 hr",
  },
];

async function main() {
  // Only ever clears its own table — never pantry or grocery. Safe to run
  // twice: a second run just replaces the same 12 test recipes.
  await db.recipe.deleteMany();
  await db.recipe.createMany({ data: recipes });

  const count = await db.recipe.count();
  console.log(`Seeded ${count} recipes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
