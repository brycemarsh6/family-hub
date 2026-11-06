// Pins the drawer's nav list and the active-row rule. The list is the one
// source of truth the drawer and the redirect map both read.

import { test } from "node:test";
import assert from "node:assert/strict";
import { NAV_ITEMS, activeNavHref } from "./nav";

test("NAV_ITEMS: hrefs are unique and absolute", () => {
  const hrefs = NAV_ITEMS.map((item) => item.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  for (const href of hrefs) assert.ok(href.startsWith("/"), `${href} is not absolute`);
});

test("NAV_ITEMS: every label is non-empty", () => {
  for (const { label } of NAV_ITEMS) assert.ok(label.trim().length > 0);
});

test("activeNavHref: a deep recipe URL lights Recipes", () => {
  assert.equal(activeNavHref("/kitchen/cooking/recipes/abc"), "/kitchen/cooking/recipes");
});

test("activeNavHref: /settings/family lights Settings", () => {
  assert.equal(activeNavHref("/settings/family"), "/settings");
});

test("activeNavHref: / matches only exactly", () => {
  assert.equal(activeNavHref("/"), "/");
});

test("activeNavHref: /login matches nothing", () => {
  assert.equal(activeNavHref("/login"), null);
});

test("activeNavHref: /profile lights Settings", () => {
  assert.equal(activeNavHref("/profile"), "/settings");
});

test("NAV_ITEMS: Profile has no row of its own", () => {
  assert.ok(!NAV_ITEMS.some((item) => item.href === "/profile"));
});
