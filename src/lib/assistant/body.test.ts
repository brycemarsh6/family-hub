import { test } from "node:test";
import assert from "node:assert/strict";
import { readJsonBody } from "./body";

const post = (body: string | undefined, headers: Record<string, string> = {}) =>
  new Request("http://x/api", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });

test("parses a JSON body", async () => {
  const r = await readJsonBody(post('{"a":1}'));
  assert.deepEqual(r, { ok: true, value: { a: 1 } });
});

test("an empty body is ok with value undefined", async () => {
  const r = await readJsonBody(post(undefined, { "content-type": "text/plain" }));
  assert.deepEqual(r, { ok: true, value: undefined });
});

test("invalid JSON is 400 invalid_json", async () => {
  const r = await readJsonBody(post("{nope"));
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error.status, 400);
    assert.equal(r.error.code, "invalid_json");
  }
});

test("a non-JSON content-type with a body is 415", async () => {
  const r = await readJsonBody(post("{}", { "content-type": "text/plain" }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.status, 415);
});

test("content-type parameters are tolerated", async () => {
  const r = await readJsonBody(post("{}", { "content-type": "application/json; charset=utf-8" }));
  assert.equal(r.ok, true);
});

test("a declared content-length over the cap is 413 before reading", async () => {
  const r = await readJsonBody(post("{}", { "content-length": "999999" }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.status, 413);
});

test("cap counts bytes, not characters", async () => {
  // 40 three-byte characters: .length 42 (with quotes) is under 50, bytes (122) are over.
  const text = JSON.stringify("€".repeat(40));
  assert.ok(text.length < 50);
  assert.ok(Buffer.byteLength(text) > 50);
  const r = await readJsonBody(post(text), 50);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.status, 413);
});

test("a body exactly at the cap is accepted", async () => {
  const text = '"' + "a".repeat(48) + '"';
  assert.equal(Buffer.byteLength(text), 50);
  const r = await readJsonBody(post(text), 50);
  assert.equal(r.ok, true);
});
