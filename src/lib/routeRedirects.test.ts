// Pins the shape of LEGACY_ROUTE_REDIRECTS against the drawer's nav list: an
// old URL must never be a live nav destination, and each one must land on one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { LEGACY_ROUTE_REDIRECTS } from "./routeRedirects";
import { NAV_ITEMS } from "./nav";

const navHrefs = NAV_ITEMS.map((item) => item.href);

test("LEGACY_ROUTE_REDIRECTS: no source is a nav href", () => {
  for (const { source } of LEGACY_ROUTE_REDIRECTS) {
    assert.ok(!navHrefs.includes(source), `${source} is a nav href`);
  }
});

test("LEGACY_ROUTE_REDIRECTS: every destination is a nav href", () => {
  for (const { destination } of LEGACY_ROUTE_REDIRECTS) {
    assert.ok(navHrefs.includes(destination), `${destination} is not a nav href`);
  }
});

test("LEGACY_ROUTE_REDIRECTS: sources are unique", () => {
  const sources = LEGACY_ROUTE_REDIRECTS.map((r) => r.source);
  assert.equal(new Set(sources).size, sources.length);
});

test("LEGACY_ROUTE_REDIRECTS: /routines and /chores both forward to /habits", () => {
  const bySource = Object.fromEntries(LEGACY_ROUTE_REDIRECTS.map((r) => [r.source, r.destination]));
  assert.equal(bySource["/routines"], "/habits");
  assert.equal(bySource["/chores"], "/habits");
});
