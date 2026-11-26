// Pins pinPolicy.ts: the PIN's shape, when it is asked for and its lock.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PIN_LENGTH,
  PIN_LOCK_MS,
  PIN_MAX_TRIES,
  isPinShaped,
  pinGate,
  pinLockActive,
  pinLockAfterWrong,
  pinLockEnded,
  pinMinutesFromMs,
  pinMinutesLeft,
} from "./pinPolicy";
import { PIN_LOCKED_TITLE, PIN_NOT_SET_HINT, PIN_NOT_SET_TITLE, PIN_WRONG, REDEEM_UNDO_REFUSAL, pinLockedText, pinRedeemText } from "../rewardVocabulary";

const NOW = new Date("2026-11-25T18:00:00Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);

test("Bryce's numbers: 4 digits, 5 tries, 5 minutes", () => {
  assert.equal(PIN_LENGTH, 4);
  assert.equal(PIN_MAX_TRIES, 5);
  assert.equal(PIN_LOCK_MS, 300000);
});

test("isPinShaped: exactly four ASCII digits", () => {
  for (const good of ["0000", "1234", "9876"]) assert.equal(isPinShaped(good), true);
  for (const bad of [" 123", "123 ", "123", "12345", "", "12a4", "1234\n", "１２３４", "١٢٣٤", null, undefined, 1234, ["1234"]]) {
    assert.equal(isPinShaped(bad), false, String(bad));
  }
});

test("pinGate: not asked or switch off is open", () => {
  assert.equal(pinGate(false, true, true), "open");
  assert.equal(pinGate(false, true, false), "open");
  assert.equal(pinGate(true, false, true), "open");
  assert.equal(pinGate(true, false, false), "open");
});

test("pinGate: asked with the switch on needs the PIN, or says none is set", () => {
  assert.equal(pinGate(true, true, true), "pin");
  assert.equal(pinGate(true, true, false), "noPin");
});

test("pinLockActive and pinLockEnded: none, future, exactly now, past", () => {
  assert.equal(pinLockActive(null, NOW), false);
  assert.equal(pinLockEnded(null, NOW), false);
  assert.equal(pinLockActive(at(1), NOW), true);
  assert.equal(pinLockEnded(at(1), NOW), false);
  assert.equal(pinLockActive(at(0), NOW), false);
  assert.equal(pinLockEnded(at(0), NOW), true);
  assert.equal(pinLockActive(at(-1000), NOW), false);
  assert.equal(pinLockEnded(at(-1000), NOW), true);
});

test("pinMinutesLeft: rounds up and never reads below 1", () => {
  assert.equal(pinMinutesLeft(at(59000), NOW), 1);
  assert.equal(pinMinutesLeft(at(60000), NOW), 1);
  assert.equal(pinMinutesLeft(at(60001), NOW), 2);
  assert.equal(pinMinutesLeft(at(PIN_LOCK_MS), NOW), 5);
  assert.equal(pinMinutesLeft(at(1), NOW), 1);
  assert.equal(pinMinutesLeft(at(-5000), NOW), 1);
  assert.equal(pinMinutesFromMs(0), 1);
});

test("pinLockAfterWrong: the 4th wrong try does not lock, the 5th does", () => {
  for (const count of [1, 2, 3, 4]) assert.equal(pinLockAfterWrong(count, NOW), null);
  assert.equal(pinLockAfterWrong(5, NOW)?.getTime(), NOW.getTime() + PIN_LOCK_MS);
  assert.equal(pinLockAfterWrong(6, NOW)?.getTime(), NOW.getTime() + PIN_LOCK_MS);
});

test("the PIN words are the mock's", () => {
  assert.equal(pinLockedText(5), "Try again in 5 minutes, or set a new PIN in Settings.");
  assert.equal(pinLockedText(1), "Try again in 1 minute, or set a new PIN in Settings.");
  assert.equal(pinRedeemText("Cupcake", "Ellie"), "A parent enters the PIN to redeem Cupcake for Ellie.");
  assert.equal(PIN_WRONG, "That PIN isn't right.");
  assert.equal(PIN_LOCKED_TITLE, "Too many wrong tries.");
  assert.equal(PIN_NOT_SET_TITLE, "A parent needs to set a PIN first.");
  assert.equal(PIN_NOT_SET_HINT, "Settings, then Rewards, then Set PIN.");
  assert.equal(REDEEM_UNDO_REFUSAL, "Only a parent can undo this now.");
});
