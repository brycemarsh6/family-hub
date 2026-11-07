import { test } from "node:test";
import assert from "node:assert/strict";
import { cookbookActionBody, cookbookTitleBody } from "./schemasCookbooks";

const ok = (r: { success: boolean }) => r.success;

test("cookbookTitleBody: a trimmed title, 1 to 200 characters, no extra keys", () => {
  assert.equal(cookbookTitleBody.parse({ title: " Weeknights " }).title, "Weeknights");
  assert.ok(!ok(cookbookTitleBody.safeParse({})));
  assert.ok(!ok(cookbookTitleBody.safeParse({ title: "   " })));
  assert.ok(!ok(cookbookTitleBody.safeParse({ title: "x".repeat(201) })));
  assert.ok(ok(cookbookTitleBody.safeParse({ title: "x".repeat(200) })));
  assert.ok(!ok(cookbookTitleBody.safeParse({ title: "A", extra: 1 })));
  assert.ok(!ok(cookbookTitleBody.safeParse({ title: 5 })));
});

test("cookbookActionBody: empty body or {} only", () => {
  assert.ok(ok(cookbookActionBody.safeParse(undefined)));
  assert.ok(ok(cookbookActionBody.safeParse({})));
  assert.ok(!ok(cookbookActionBody.safeParse({ x: 1 })));
});
