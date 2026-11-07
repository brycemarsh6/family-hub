import { test } from "node:test";
import assert from "node:assert/strict";
import { toCookbook, toCookbookDetail, toCookbookShareUrl } from "./serializeCookbooks";

const row = {
  id: "c1",
  title: "Weeknights",
  shareToken: "tok",
  _count: { recipes: 2 },
  recipes: [
    { addedAt: new Date("2026-10-01T12:00:00Z"), recipe: { id: "r1", title: "Soup" } },
    { addedAt: new Date("2026-10-05T12:00:00Z"), recipe: { id: "r2", title: "Stew" } },
  ],
  // Columns that must never reach the wire:
  updatedAt: new Date(),
};

test("toCookbook: exact key set, never the token", () => {
  const out = toCookbook(row);
  assert.deepEqual(Object.keys(out).sort(), ["id", "recipeCount", "shared", "title"]);
  assert.equal(out.recipeCount, 2);
  assert.equal(out.shared, true);
  assert.equal(toCookbook({ ...row, shareToken: null }).shared, false);
  assert.ok(!JSON.stringify(out).includes("tok"));
});

test("toCookbookShareUrl: absolute from the origin, null without a token", () => {
  assert.equal(toCookbookShareUrl("https://x.test", "tok"), "https://x.test/share/cookbook/tok");
  assert.equal(toCookbookShareUrl("https://x.test", null), null);
});

test("toCookbookDetail: newest filing first, ISO dates, exact key set", () => {
  const out = toCookbookDetail(row, "https://x.test", true);
  assert.deepEqual(Object.keys(out).sort(), [
    "createdByAssistant", "id", "recipeCount", "recipes", "shareUrl", "shared", "title",
  ]);
  assert.deepEqual(out.recipes, [
    { id: "r2", title: "Stew", addedAt: "2026-10-05T12:00:00.000Z" },
    { id: "r1", title: "Soup", addedAt: "2026-10-01T12:00:00.000Z" },
  ]);
  assert.equal(out.shareUrl, "https://x.test/share/cookbook/tok");
  assert.equal(out.createdByAssistant, true);
  assert.equal(toCookbookDetail({ ...row, shareToken: null }, "https://x.test", false).shareUrl, null);
});
