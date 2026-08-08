// Test cookbooks for exercising C1 (create, file, unfile, delete) without
// touching anything the family actually made. Matched by exact title, same
// pattern as recipe-seed-data.ts — "ZZZ Test" is distinctive enough that a
// real cookbook name would never collide with it.
//
// The weeknight cookbook is filed with two of the test recipes from
// recipe-seed-data.ts, so seed-cookbooks.ts depends on those already
// existing — run `npm run db:seed-recipes` first for a full test set. The
// second cookbook is deliberately left empty, to exercise the empty-state
// and "delete an empty cookbook" paths.

export const WEEKNIGHT_COOKBOOK_TITLE = "ZZZ Test Cookbook — Weeknight";
export const EMPTY_COOKBOOK_TITLE = "ZZZ Test Cookbook — Empty";

export const cookbookTitles = [WEEKNIGHT_COOKBOOK_TITLE, EMPTY_COOKBOOK_TITLE];

export const weeknightRecipeTitles = ["Apple Crisp", "Banana Bread"];
