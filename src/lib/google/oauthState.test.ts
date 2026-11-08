import { test } from "node:test";
import assert from "node:assert/strict";
import { newOauthState, oauthStatesMatch, STATE_COOKIE_NAME, STATE_TTL_SECONDS } from "./oauthState";

test("newOauthState is 32 bytes of base64url and never repeats", () => {
  const a = newOauthState();
  const b = newOauthState();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
});

test("oauthStatesMatch accepts equal values", () => {
  const a = newOauthState();
  assert.equal(oauthStatesMatch(a, a), true);
  assert.equal(oauthStatesMatch(a, String(a)), true);
});

test("oauthStatesMatch rejects different values, lengths and empties", () => {
  const a = newOauthState();
  assert.equal(oauthStatesMatch(a, newOauthState()), false);
  assert.equal(oauthStatesMatch(a, a.slice(0, -1)), false);
  assert.equal(oauthStatesMatch(a, ""), false);
  assert.equal(oauthStatesMatch("", ""), false);
  assert.equal(oauthStatesMatch(null, a), false);
  assert.equal(oauthStatesMatch(a, undefined), false);
});

test("cookie constants", () => {
  assert.equal(STATE_COOKIE_NAME, "google_oauth_state");
  assert.equal(STATE_TTL_SECONDS, 600);
});
