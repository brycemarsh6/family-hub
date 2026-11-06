import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeChangeSummary, encodeChangeSummary } from "@/lib/assistant/changeCopy";

test("changeCopy: v2 round trip turns a Date into an ISO string", () => {
  const when = new Date("2026-11-06T12:00:00.000Z");
  const text = encodeChangeSummary({
    detail: { name: "x" },
    before: { id: "a", quantity: 1, updatedAt: when },
    after: null,
  });
  const out = decodeChangeSummary(text);
  assert.equal(out.version, 2);
  assert.deepEqual(out.detail, { name: "x" });
  assert.deepEqual(out.before, { id: "a", quantity: 1, updatedAt: "2026-11-06T12:00:00.000Z" });
  assert.equal(out.after, null);
});

test("changeCopy: stored text starts with the v2 marker", () => {
  const text = encodeChangeSummary({ detail: 1, before: null, after: { id: "a" } });
  assert.deepEqual(JSON.parse(text), { v: 2, detail: 1, before: null, after: { id: "a" } });
});

test("changeCopy: old plain-JSON summary decodes as v1 with identical detail", () => {
  const detail = { name: "milk", from: 1, to: 2 };
  const out = decodeChangeSummary(JSON.stringify(detail));
  assert.equal(out.version, 1);
  assert.deepEqual(out.detail, detail);
  assert.equal(out.before, undefined);
  assert.equal(out.after, undefined);
});

test("changeCopy: a stored null summary is v1 with null detail", () => {
  const out = decodeChangeSummary("null");
  assert.equal(out.version, 1);
  assert.equal(out.detail, null);
  assert.equal(decodeChangeSummary(null).version, 1);
});

test("changeCopy: valid JSON that is not an object is v1", () => {
  for (const text of ['"hello"', "42", "true", "[1,2]", '[{"v":2}]']) {
    const out = decodeChangeSummary(text);
    assert.equal(out.version, 1, text);
    assert.deepEqual(out.detail, JSON.parse(text));
    assert.equal(out.before, undefined);
  }
});

test("changeCopy: an old object that merely has other keys stays v1", () => {
  const out = decodeChangeSummary('{"v":1,"detail":"x"}');
  assert.equal(out.version, 1);
  assert.deepEqual(out.detail, { v: 1, detail: "x" });
});

test("changeCopy: text that is not JSON does not throw", () => {
  const out = decodeChangeSummary("{oops");
  assert.equal(out.version, 1);
  assert.equal(out.detail, "{oops");
});

test("changeCopy: a v2 object missing keys decodes safely", () => {
  const out = decodeChangeSummary('{"v":2}');
  assert.equal(out.version, 2);
  assert.equal(out.detail, null);
  assert.equal(out.before, undefined);
  assert.equal(out.after, undefined);
  const odd = decodeChangeSummary('{"v":2,"detail":5,"before":"nope","after":[1]}');
  assert.equal(odd.version, 2);
  assert.equal(odd.detail, 5);
  assert.equal(odd.before, undefined);
  assert.equal(odd.after, undefined);
});
