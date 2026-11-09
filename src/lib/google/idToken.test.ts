import { test } from "node:test";
import assert from "node:assert/strict";
import { identityFromIdToken } from "./idToken";

function jwt(payload: unknown): string {
  const enc = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${enc({ alg: "none" })}.${enc(payload)}.sig`;
}

test("a good token gives sub and email", () => {
  assert.deepEqual(identityFromIdToken(jwt({ sub: "123", email: "a@b.com", aud: "x" })), {
    sub: "123",
    email: "a@b.com",
  });
});

test("wrong part count is null", () => {
  assert.equal(identityFromIdToken("onlyonepart"), null);
  assert.equal(identityFromIdToken("a.b"), null);
  assert.equal(identityFromIdToken("a.b.c.d"), null);
  assert.equal(identityFromIdToken(""), null);
});

test("invalid base64 or invalid JSON is null", () => {
  assert.equal(identityFromIdToken("a.!!!notbase64!!!.c"), null);
  assert.equal(identityFromIdToken(`a.${Buffer.from("not json").toString("base64url")}.c`), null);
  assert.equal(identityFromIdToken(`a.${Buffer.from("42").toString("base64url")}.c`), null);
  assert.equal(identityFromIdToken(`a.${Buffer.from("null").toString("base64url")}.c`), null);
});

test("missing or wrong-typed sub or email is null", () => {
  assert.equal(identityFromIdToken(jwt({ email: "a@b.com" })), null);
  assert.equal(identityFromIdToken(jwt({ sub: "123" })), null);
  assert.equal(identityFromIdToken(jwt({ sub: "", email: "a@b.com" })), null);
  assert.equal(identityFromIdToken(jwt({ sub: 123, email: "a@b.com" })), null);
  assert.equal(identityFromIdToken(jwt({ sub: "123", email: null })), null);
});
