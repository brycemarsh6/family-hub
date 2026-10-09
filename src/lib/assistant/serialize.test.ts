import { test } from "node:test";
import assert from "node:assert/strict";
import { toFamilyMember, toInventoryItem, toReviewQueue } from "./serialize";

const DENVER = "America/Denver";
const today = { year: 2026, month: 10, day: 9 };

const base = {
  id: "i1",
  name: "Zzz Widget",
  quantity: 3,
  unit: null,
  category: "Other",
  location: "Pantry",
  lowThreshold: 1,
  expiresAt: null,
  restockedAt: new Date("2026-10-01T12:00:00Z"),
  updatedAt: new Date("2026-10-02T12:00:00Z"),
};
const ctx = { onList: false, today, timeZone: DENVER };

test("status boundaries: 0 is out, at threshold is low, above is ok", () => {
  const s = (quantity: number, lowThreshold = 1) =>
    toInventoryItem({ ...base, quantity, lowThreshold }, ctx).status;
  assert.equal(s(0), "out");
  assert.equal(s(0, 0), "out"); // out wins over low when threshold is 0
  assert.equal(s(0.5), "low");
  assert.equal(s(1), "low");
  assert.equal(s(1.01), "ok");
  assert.equal(s(2, 2), "low");
  assert.equal(s(3, 2), "ok");
});

test("expiresOn: a Denver-midnight instant reads as that Denver date", () => {
  // Oct 12 Denver midnight = 06:00Z reads as the 12th; 02:00Z that day is
  // still Oct 11 at 8 pm in Denver and must read as the 11th.
  const a = toInventoryItem({ ...base, expiresAt: new Date("2026-10-12T06:00:00Z") }, ctx);
  assert.equal(a.expiresOn, "2026-10-12");
  assert.equal(a.expiry?.date, "2026-10-12");
  assert.equal(a.expiry?.isEstimate, false);
  assert.equal(a.expiry?.daysLeft, 3);
  const b = toInventoryItem({ ...base, expiresAt: new Date("2026-10-12T02:00:00Z") }, ctx);
  assert.equal(b.expiresOn, "2026-10-11");
});

test("an estimate is flagged isEstimate and expiresOn stays null", () => {
  const row = {
    ...base,
    name: "Strawberries",
    category: "Produce",
    location: "Fridge",
    restockedAt: new Date("2026-10-08T18:00:00Z"),
  };
  const r = toInventoryItem(row, { ...ctx, onList: true });
  assert.equal(r.expiresOn, null);
  assert.ok(r.expiry, "strawberries in the fridge should get an estimate");
  assert.equal(r.expiry.isEstimate, true);
  assert.equal(r.onShoppingList, true);
  assert.equal(r.restockedAt, "2026-10-08T18:00:00.000Z");
});

test("no real date and no estimate gives expiry null", () => {
  const r = toInventoryItem({ ...base, name: "Zzz Widget", category: "Other" }, ctx);
  assert.equal(r.expiry, null);
});

test("toFamilyMember never carries a credential, even from a row that has one", () => {
  const row = {
    id: "u1",
    displayName: "Test Person",
    role: "kid",
    deactivatedAt: null,
    passwordHash: "$2a$11$secret",
    voiceTokenHash: "deadbeef",
  };
  const out = toFamilyMember(row);
  assert.deepEqual(Object.keys(out).sort(), ["displayName", "id", "isActive", "isKid", "role"]);
  assert.ok(!JSON.stringify(out).includes("secret"));
  assert.ok(!JSON.stringify(out).includes("deadbeef"));
  assert.equal(out.isKid, true);
  assert.equal(toFamilyMember({ ...row, role: "parent", deactivatedAt: new Date() }).isActive, false);
});

test("toReviewQueue narrows items to the six wire fields", () => {
  const item = (id: string) => ({
    id,
    name: id,
    location: "Pantry",
    category: "Other",
    quantity: 1,
    unit: null,
    extra: "nope",
  });
  const out = toReviewQueue({
    total: 2,
    pairs: [{ kind: "same-name", fingerprint: "f1", a: item("a"), b: item("b") }],
    parked: [{ kind: "other-location", fingerprint: "f2", item: item("c") }],
  });
  assert.equal(out.total, 2);
  assert.deepEqual(Object.keys(out.pairs[0].a).sort(), ["category", "id", "location", "name", "quantity", "unit"]);
  assert.deepEqual(Object.keys(out.parked[0].item).sort(), ["category", "id", "location", "name", "quantity", "unit"]);
  assert.equal(out.pairs[0].fingerprint, "f1");
});
