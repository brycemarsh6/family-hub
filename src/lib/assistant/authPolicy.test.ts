import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBearer, hashToken, isTokenValid } from "./authPolicy";

test("parseBearer accepts a normal header", () => {
  assert.equal(parseBearer("Bearer abc123"), "abc123");
});
test("parseBearer scheme is case-insensitive", () => {
  assert.equal(parseBearer("bEaReR abc"), "abc");
});
test("parseBearer trims surrounding whitespace", () => {
  assert.equal(parseBearer("  Bearer abc  "), "abc");
});
test("parseBearer rejects null and empty", () => {
  assert.equal(parseBearer(null), null);
  assert.equal(parseBearer(""), null);
});
test("parseBearer rejects Bearer with no token", () => {
  assert.equal(parseBearer("Bearer"), null);
  assert.equal(parseBearer("Bearer "), null);
});
test("parseBearer rejects other schemes", () => {
  assert.equal(parseBearer("Basic dXNlcjpwYXNz"), null);
});
test("parseBearer rejects two tokens and double spaces", () => {
  assert.equal(parseBearer("Bearer a b"), null);
  assert.equal(parseBearer("Bearer  a"), null);
});
test("parseBearer rejects a bare token with no scheme", () => {
  assert.equal(parseBearer("abc123"), null);
});

test("hashToken is sha256 lowercase hex", () => {
  assert.equal(
    hashToken("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("isTokenValid accepts the right token", () => {
  assert.equal(isTokenValid("secret", hashToken("secret")), true);
});
test("isTokenValid rejects a wrong token", () => {
  assert.equal(isTokenValid("nope", hashToken("secret")), false);
});
test("isTokenValid rejects wrong-length tokens without throwing", () => {
  assert.equal(isTokenValid("", hashToken("secret")), false);
  assert.equal(isTokenValid("x".repeat(10_000), hashToken("secret")), false);
});
test("isTokenValid accepts an uppercase hex hash", () => {
  assert.equal(isTokenValid("secret", hashToken("secret").toUpperCase()), true);
});
test("isTokenValid returns false for a malformed expected hash", () => {
  assert.equal(isTokenValid("secret", ""), false);
  assert.equal(isTokenValid("secret", "abc"), false);
  assert.equal(isTokenValid("secret", "z".repeat(64)), false);
  assert.equal(isTokenValid("secret", hashToken("secret") + "00"), false);
});
