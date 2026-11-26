// Pins rewardGates.ts: every role against the PIN switch and PIN set states.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ROLES, type Role } from "./constants";
import { manageGate, mayChangeWish, redeemGate, rewardRights, type Gate, type PinState } from "./rewardGates";

const off: PinState = { pinRequired: false, pinSet: false };
const offButSet: PinState = { pinRequired: false, pinSet: true };
const onSet: PinState = { pinRequired: true, pinSet: true };
const onUnset: PinState = { pinRequired: true, pinSet: false };
const actor = (role: Role) => ({ userId: `${role}-1`, role });

test("redeemGate: a parent or admin is never asked, whatever the PIN state", () => {
  for (const role of ["admin", "parent"] as const) {
    for (const state of [off, offButSet, onSet, onUnset]) assert.equal(redeemGate(actor(role), "anyone", state), "open");
  }
});

test("redeemGate: the tablet redeems for anyone, through the PIN", () => {
  const tablet = actor("device");
  assert.equal(redeemGate(tablet, "kid-1", off), "open");
  assert.equal(redeemGate(tablet, "kid-1", offButSet), "open");
  assert.equal(redeemGate(tablet, "kid-1", onSet), "pin");
  assert.equal(redeemGate(tablet, "kid-2", onUnset), "noPin");
});

test("redeemGate: a kid redeems their own through the PIN, never another person's", () => {
  const kid = actor("kid");
  assert.equal(redeemGate(kid, "kid-1", off), "open");
  assert.equal(redeemGate(kid, "kid-1", offButSet), "open");
  assert.equal(redeemGate(kid, "kid-1", onSet), "pin");
  assert.equal(redeemGate(kid, "kid-1", onUnset), "noPin");
  for (const state of [off, offButSet, onSet, onUnset]) assert.equal(redeemGate(kid, "someone-else", state), "no");
});

test("manageGate: parents open, the tablet through the PIN, a kid never", () => {
  for (const role of ["admin", "parent"] as const) {
    for (const state of [off, offButSet, onSet, onUnset]) assert.equal(manageGate(actor(role), state), "open");
  }
  assert.equal(manageGate(actor("device"), off), "open");
  assert.equal(manageGate(actor("device"), offButSet), "open");
  assert.equal(manageGate(actor("device"), onSet), "pin");
  assert.equal(manageGate(actor("device"), onUnset), "noPin");
  for (const state of [off, offButSet, onSet, onUnset]) assert.equal(manageGate(actor("kid"), state), "no");
});

test("mayChangeWish: the tablet for anyone, a kid for their own, parents not by this rule", () => {
  assert.equal(mayChangeWish(actor("device"), "kid-9"), true);
  assert.equal(mayChangeWish(actor("kid"), "kid-1"), true);
  assert.equal(mayChangeWish(actor("kid"), "kid-2"), false);
  assert.equal(mayChangeWish(actor("parent"), "parent-1"), false);
  assert.equal(mayChangeWish(actor("admin"), "kid-1"), false);
});

test("every role gets a defined gate for every PIN state", () => {
  const valid: Gate[] = ["open", "pin", "noPin", "no"];
  for (const role of ROLES) {
    for (const state of [off, offButSet, onSet, onUnset]) {
      assert.ok(valid.includes(redeemGate(actor(role), "kid-1", state)));
      assert.ok(valid.includes(manageGate(actor(role), state)));
    }
  }
});

test("rewardRights: plain data per person for the page", () => {
  const rights = rewardRights(actor("kid"), ["kid-1", "kid-2"], onSet);
  assert.deepEqual(rights, {
    manage: "no",
    people: { "kid-1": { redeem: "pin", wish: true, addWish: true }, "kid-2": { redeem: "no", wish: false, addWish: false } },
  });
  const tablet = rewardRights(actor("device"), ["kid-1"], onUnset);
  assert.deepEqual(tablet, { manage: "noPin", people: { "kid-1": { redeem: "noPin", wish: true, addWish: true } } });
  const parent = rewardRights(actor("parent"), ["kid-1"], onSet);
  assert.deepEqual(parent, { manage: "open", people: { "kid-1": { redeem: "open", wish: false, addWish: false } } });
});

test("rewardRights addWish: the Add a wish tile shows only while Add reward is not open to the login", () => {
  assert.equal(rewardRights(actor("device"), ["kid-1"], onSet).people["kid-1"].addWish, true);
  assert.equal(rewardRights(actor("device"), ["kid-1"], off).people["kid-1"].addWish, false);
  assert.equal(rewardRights(actor("kid"), ["kid-1"], off).people["kid-1"].addWish, true);
  assert.equal(rewardRights(actor("kid"), ["kid-2"], onSet).people["kid-2"].addWish, false);
  assert.equal(rewardRights(actor("parent"), ["kid-1"], onSet).people["kid-1"].addWish, false);
});
