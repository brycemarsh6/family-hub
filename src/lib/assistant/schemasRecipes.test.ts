import { test } from "node:test";
import assert from "node:assert/strict";
import {
  recipeActionBody,
  recipeCreateBody,
  recipePatchBody,
  recipesListQuery,
  tagCreateBody,
} from "./schemasRecipes";

const ok = (r: { success: boolean }) => r.success;
const base = { title: " Soup ", ingredients: ["1 onion"], steps: ["Cook it"] };

test("recipesListQuery: maxMinutes coerces, unknown keys refused", () => {
  assert.equal(recipesListQuery.parse({ maxMinutes: "30" }).maxMinutes, 30);
  assert.ok(!ok(recipesListQuery.safeParse({ maxMinutes: "0" })));
  assert.ok(!ok(recipesListQuery.safeParse({ maxMinutes: "soon" })));
  assert.ok(!ok(recipesListQuery.safeParse({ colour: "red" })));
  assert.ok(ok(recipesListQuery.safeParse({})));
});

test("recipeCreateBody: needs a title, one ingredient and one step, as one-line strings", () => {
  assert.equal(recipeCreateBody.parse(base).title, "Soup");
  assert.ok(!ok(recipeCreateBody.safeParse({ ...base, title: "  " })));
  assert.ok(!ok(recipeCreateBody.safeParse({ ...base, ingredients: [] })));
  assert.ok(!ok(recipeCreateBody.safeParse({ ...base, steps: [] })));
  assert.ok(!ok(recipeCreateBody.safeParse({ ...base, steps: ["one\ntwo"] })));
  assert.ok(!ok(recipeCreateBody.safeParse({ ...base, ingredients: "1 onion" })));
  assert.ok(!ok(recipeCreateBody.safeParse({ ...base, extra: 1 })));
  assert.ok(ok(recipeCreateBody.safeParse({ ...base, cookbookId: "c1", tagIds: ["t1"], notes: null })));
});

test("recipePatchBody: at least one key, rating 1 to 5 or null", () => {
  assert.ok(!ok(recipePatchBody.safeParse({})));
  assert.ok(ok(recipePatchBody.safeParse({ rating: null })));
  assert.ok(ok(recipePatchBody.safeParse({ rating: 5 })));
  assert.ok(!ok(recipePatchBody.safeParse({ rating: 6 })));
  assert.ok(!ok(recipePatchBody.safeParse({ rating: 2.5 })));
  assert.ok(ok(recipePatchBody.safeParse({ tagIds: [] })));
  assert.ok(!ok(recipePatchBody.safeParse({ title: null })));
  assert.ok(!ok(recipePatchBody.safeParse({ ingredients: [] })));
});

test("recipeActionBody takes nothing; tagCreateBody needs a name", () => {
  assert.ok(ok(recipeActionBody.safeParse(undefined)));
  assert.ok(ok(recipeActionBody.safeParse({})));
  assert.ok(!ok(recipeActionBody.safeParse({ a: 1 })));
  assert.equal(tagCreateBody.parse({ name: " Soup " }).name, "Soup");
  assert.ok(!ok(tagCreateBody.safeParse({ name: " " })));
});
