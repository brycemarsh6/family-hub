// Pins the "Finish setting up" rules: five rows in the mock's order, the Google
// row hidden when Google is off, each self-tick, the required-only finish, who
// sees the card, and the login `after` allowlist.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checklistAllRequiredDone,
  setupChecklistItems,
  showSetupChecklist,
  type ChecklistFacts,
} from "./setupChecklist";
import { postLoginPath } from "./startPage";
import {
  CHECKLIST_WORDS,
  INSTALL_ROW_WORDS,
  INSTALL_STEPS,
  INSTALL_WORDS,
  WELCOME_WORDS,
  checklistCount,
} from "./welcomeVocabulary";

const NONE: ChecklistFacts = {
  hasOtherPeople: false,
  storesSaved: false,
  hasPantryItem: false,
  hasTablet: false,
  hasLinkedGoogle: false,
  googleConfigured: true,
};

test("five rows in the mock's order, with their pages and optional flags", () => {
  const items = setupChecklistItems(NONE);
  assert.deepEqual(
    items.map((i) => [i.id, i.label, i.href, i.optional, i.done]),
    [
      ["family", "Add your family", "/settings/family", false, false],
      ["stores", "Pick your stores", "/settings/stores", false, false],
      ["pantry", "Add pantry items", "/kitchen/inventory", false, false],
      ["tablet", "Set up a wall tablet", "/settings/family", true, false],
      ["google", "Link Google Calendar", "/settings/calendars", true, false],
    ],
  );
});

test("the Google row is left out when Google is not configured", () => {
  const items = setupChecklistItems({ ...NONE, googleConfigured: false, hasLinkedGoogle: true });
  assert.deepEqual(items.map((i) => i.id), ["family", "stores", "pantry", "tablet"]);
});

test("each row ticks from its own fact only", () => {
  const cases: [keyof ChecklistFacts, string][] = [
    ["hasOtherPeople", "family"],
    ["storesSaved", "stores"],
    ["hasPantryItem", "pantry"],
    ["hasTablet", "tablet"],
    ["hasLinkedGoogle", "google"],
  ];
  for (const [fact, id] of cases) {
    const done = setupChecklistItems({ ...NONE, [fact]: true }).filter((i) => i.done).map((i) => i.id);
    assert.deepEqual(done, [id]);
  }
});

test("all-required-done ignores the optional rows", () => {
  const required = { ...NONE, hasOtherPeople: true, storesSaved: true, hasPantryItem: true };
  assert.equal(checklistAllRequiredDone(setupChecklistItems(required)), true);
  assert.equal(checklistAllRequiredDone(setupChecklistItems({ ...required, hasPantryItem: false })), false);
  // Optional rows done but a required one missing is still not done.
  const optionalOnly = { ...NONE, hasTablet: true, hasLinkedGoogle: true };
  assert.equal(checklistAllRequiredDone(setupChecklistItems(optionalOnly)), false);
});

test("showSetupChecklist: true only for an admin on a set-up, undismissed, non-owner copy", () => {
  const ok = { isOwner: false, setupFinished: true, dismissed: false, role: "admin" };
  assert.equal(showSetupChecklist(ok), true);
  assert.equal(showSetupChecklist({ ...ok, isOwner: true }), false);
  assert.equal(showSetupChecklist({ ...ok, setupFinished: false }), false);
  assert.equal(showSetupChecklist({ ...ok, dismissed: true }), false);
  for (const role of ["parent", "kid", "device"]) {
    assert.equal(showSetupChecklist({ ...ok, role }), false, role);
  }
});

test("postLoginPath: only exactly /welcome is honoured, else the start page", () => {
  assert.equal(postLoginPath("/welcome", "/habits"), "/welcome");
  assert.equal(postLoginPath(null, "/habits"), "/habits");
  assert.equal(postLoginPath(undefined, undefined), "/");
  for (const bad of ["//evil.com", "https://x", "/welcome?x", "/welcome/", "/Welcome", " /welcome", "/habits", ""]) {
    assert.equal(postLoginPath(bad, "/habits"), "/habits", bad);
  }
});

test("words: the mock's exact strings, and no dashes", () => {
  assert.equal(CHECKLIST_WORDS.title, "Finish setting up");
  assert.equal(CHECKLIST_WORDS.hide, "Hide this");
  assert.equal(CHECKLIST_WORDS.allSetTitle, "You're all set");
  assert.equal(INSTALL_ROW_WORDS.label, "Install on your phone");
  assert.equal(checklistCount(2, 5), "2 of 5");
  const strings: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") strings.push(value);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  [WELCOME_WORDS, INSTALL_WORDS, INSTALL_STEPS, CHECKLIST_WORDS, INSTALL_ROW_WORDS, checklistCount(2, 5)].forEach(walk);
  assert.ok(strings.length > 20);
  for (const text of strings) assert.doesNotMatch(text, /[\u2013\u2014]/, text);
});
