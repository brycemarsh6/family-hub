// The meal-plan test data shared by seed-meal-plans.ts and
// clean-meal-plans.ts — the same split prisma/recipe-seed-data.ts uses, so
// the cleanup script can identify test data without importing (and running)
// the seeder.
//
// WHY THIS IS SHAPED DIFFERENTLY FROM THE RECIPE VERSION:
// the recipe scripts scope by title, because a recipe row is independently
// identifiable. A meal plan is keyed by `weekStart`, and the weeks this seed
// uses are "last week" and "this week" — precisely the weeks the family
// plans for real. Scoping deletes by weekStart would therefore be *more*
// dangerous than the blanket deleteMany it replaces, not less: it would
// reliably target real plans.
//
// So the fingerprint is the entry set instead. A plan is treated as test
// data only when its entries match one of these templates EXACTLY — same
// number of entries, and the same (dayOffset, slot, title) on every one.
// Edit or add a single meal and the plan stops matching, so cleanup leaves
// it alone. The failure mode is "refuses to delete", which is the correct
// direction to fail when the alternative is destroying a real week.

export type SeedEntry = { dayOffset: number; slot: string; title: string };

export type SeedWeekTemplate = {
  /** Which week this fills — resolved to a real date by the seeder. */
  when: "lastWeek" | "thisWeek" | "dstWeek";
  entries: SeedEntry[];
};

export const SEED_WEEK_TEMPLATES: SeedWeekTemplate[] = [
  {
    when: "lastWeek",
    entries: [
      { dayOffset: 0, slot: "Dinner", title: "Pot roast" },
      { dayOffset: 2, slot: "Dinner", title: "Leftovers" },
      { dayOffset: 4, slot: "Dinner", title: "Tacos" },
      { dayOffset: 6, slot: "Lunch", title: "Eating out" },
    ],
  },
  {
    when: "thisWeek",
    entries: [
      { dayOffset: 0, slot: "Breakfast", title: "Pancakes" },
      { dayOffset: 0, slot: "Dinner", title: "Honey mustard chicken" },
      { dayOffset: 1, slot: "Dinner", title: "Jambalaya" },
      { dayOffset: 3, slot: "Lunch", title: "Leftovers" },
      { dayOffset: 5, slot: "Dinner", title: "Takeout" },
    ],
  },
  {
    when: "dstWeek",
    entries: [
      {
        dayOffset: 0,
        slot: "Dinner",
        title: "Chocolate chip cookies for dessert",
      },
      { dayOffset: 3, slot: "Dinner", title: "Zucchini bread" },
    ],
  },
];

/** A stable, order-independent signature for a set of entries. Two plans
 * with the same meals in a different row order still match. */
export function entrySignature(entries: readonly SeedEntry[]): string {
  return entries
    .map((e) => `${e.dayOffset}|${e.slot}|${e.title}`)
    .sort()
    .join("\n");
}

/** Every seeded week's signature — what cleanup matches candidates against. */
export const SEED_SIGNATURES: ReadonlySet<string> = new Set(
  SEED_WEEK_TEMPLATES.map((week) => entrySignature(week.entries)),
);
