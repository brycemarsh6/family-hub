import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUTHOR_NAME_MAX,
  FAMILY_NAME_MAX,
  FORWARD_PER_FAMILY_PER_HOUR,
  FORWARD_TOTAL_PER_HOUR,
  familyName,
  forwardConfig,
  inboxRateLimited,
  parseForwardedFeedback,
} from "./feedbackForward";
import { MESSAGE_MAX, USER_AGENT_MAX } from "./feedback";

const KEY = "k".repeat(32);
const GOOD = {
  family: "Smith family",
  authorName: "Ann",
  message: "The tile is cut off",
  pagePath: "/habits",
  userAgent: "UA",
  viewport: "820x1180",
  screenshot: null,
};

test("forwardConfig needs both settings", () => {
  assert.equal(forwardConfig({}), null);
  assert.equal(forwardConfig({ FEEDBACK_FORWARD_URL: "https://a.example/x" }), null);
  assert.equal(forwardConfig({ FEEDBACK_FORWARD_KEY: KEY }), null);
  assert.equal(forwardConfig({ FEEDBACK_FORWARD_URL: "  ", FEEDBACK_FORWARD_KEY: KEY }), null);
});

test("forwardConfig accepts https and returns trimmed values", () => {
  assert.deepEqual(
    forwardConfig({ FEEDBACK_FORWARD_URL: " https://a.example/x ", FEEDBACK_FORWARD_KEY: ` ${KEY} ` }),
    { url: "https://a.example/x", key: KEY },
  );
});

test("forwardConfig refuses plain http except localhost", () => {
  const key = KEY;
  assert.equal(forwardConfig({ FEEDBACK_FORWARD_URL: "http://a.example/x", FEEDBACK_FORWARD_KEY: key }), null);
  assert.ok(forwardConfig({ FEEDBACK_FORWARD_URL: "http://localhost:3000/x", FEEDBACK_FORWARD_KEY: key }));
  assert.ok(forwardConfig({ FEEDBACK_FORWARD_URL: "http://127.0.0.1:3000/x", FEEDBACK_FORWARD_KEY: key }));
  assert.equal(forwardConfig({ FEEDBACK_FORWARD_URL: "ftp://a.example/x", FEEDBACK_FORWARD_KEY: key }), null);
  assert.equal(forwardConfig({ FEEDBACK_FORWARD_URL: "not a url", FEEDBACK_FORWARD_KEY: key }), null);
});

test("forwardConfig refuses a short key", () => {
  assert.equal(
    forwardConfig({ FEEDBACK_FORWARD_URL: "https://a.example/x", FEEDBACK_FORWARD_KEY: "k".repeat(31) }),
    null,
  );
});

test("familyName tidies, caps and falls back", () => {
  assert.equal(familyName("  Smith \n  family "), "Smith family");
  assert.equal(familyName("x".repeat(100)).length, FAMILY_NAME_MAX);
  assert.equal(familyName(undefined), "Unnamed family");
  assert.equal(familyName("   "), "Unnamed family");
});

test("parseForwardedFeedback accepts a good payload", () => {
  assert.deepEqual(parseForwardedFeedback(GOOD), { ok: true, value: GOOD });
});

test("parseForwardedFeedback trims and caps names", () => {
  const r = parseForwardedFeedback({ ...GOOD, family: "  " + "f".repeat(100), authorName: "a".repeat(100) });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.family.length, FAMILY_NAME_MAX);
    assert.equal(r.value.authorName.length, AUTHOR_NAME_MAX);
  }
});

test("parseForwardedFeedback rejects bad shapes and types", () => {
  for (const bad of [null, undefined, "x", 5, [], {}]) {
    assert.deepEqual(parseForwardedFeedback(bad), { ok: false });
  }
  assert.deepEqual(parseForwardedFeedback({ ...GOOD, family: "  " }), { ok: false });
  assert.deepEqual(parseForwardedFeedback({ ...GOOD, family: 4 }), { ok: false });
  assert.deepEqual(parseForwardedFeedback({ ...GOOD, authorName: "" }), { ok: false });
  assert.deepEqual(parseForwardedFeedback({ ...GOOD, authorName: null }), { ok: false });
  assert.deepEqual(parseForwardedFeedback({ ...GOOD, message: "   " }), { ok: false });
  assert.deepEqual(parseForwardedFeedback({ ...GOOD, message: "m".repeat(MESSAGE_MAX + 1) }), { ok: false });
  assert.deepEqual(parseForwardedFeedback({ ...GOOD, message: 7 }), { ok: false });
  assert.deepEqual(parseForwardedFeedback({ ...GOOD, screenshot: 12 }), { ok: false });
  assert.deepEqual(parseForwardedFeedback({ ...GOOD, screenshot: { a: 1 } }), { ok: false });
});

test("parseForwardedFeedback cleans the small fields", () => {
  const r = parseForwardedFeedback({
    ...GOOD,
    pagePath: "//evil.example",
    viewport: "wide",
    userAgent: "u".repeat(USER_AGENT_MAX + 50),
  });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.pagePath, "/");
    assert.equal(r.value.viewport, "");
    assert.equal(r.value.userAgent.length, USER_AGENT_MAX);
  }
});

test("parseForwardedFeedback passes a screenshot string through unjudged", () => {
  const r = parseForwardedFeedback({ ...GOOD, screenshot: "data:image/jpeg;base64,AAAA" });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.screenshot, "data:image/jpeg;base64,AAAA");
  const missing = parseForwardedFeedback({ ...GOOD, screenshot: undefined });
  assert.ok(missing.ok);
  if (missing.ok) assert.equal(missing.value.screenshot, null);
});

test("inboxRateLimited trips at either limit", () => {
  assert.equal(inboxRateLimited({ family: 0, total: 0 }), false);
  assert.equal(inboxRateLimited({ family: FORWARD_PER_FAMILY_PER_HOUR - 1, total: 5 }), false);
  assert.equal(inboxRateLimited({ family: FORWARD_PER_FAMILY_PER_HOUR, total: 10 }), true);
  assert.equal(inboxRateLimited({ family: 1, total: FORWARD_TOTAL_PER_HOUR - 1 }), false);
  assert.equal(inboxRateLimited({ family: 1, total: FORWARD_TOTAL_PER_HOUR }), true);
});
