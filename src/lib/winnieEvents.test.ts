import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WINNIE_RETRY_DELAYS_MS,
  buildWinnieEvent,
  deliverWinnieEvent,
  shouldRetry,
  type AttemptOutcome,
  type WinnieEvent,
} from "./winnieEvents";

const URL_FAKE = "http://127.0.0.1:9/hook";
const KEY_FAKE = "test-key";
const INPUT = { type: "connection.test", title: "Hello", body: "World" };
const EVENT: WinnieEvent = buildWinnieEvent(INPUT, new Date("2026-07-01T12:00:00Z"), "abcd-1234");

type Step = number | "network" | ((init: RequestInit) => Promise<Response>);

function harness(steps: Step[], timeoutMs?: number) {
  const calls: { url: string; init: RequestInit }[] = [];
  const delays: number[] = [];
  const logs: string[] = [];
  let i = 0;
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const step = steps[i++];
    if (step === "network") throw new TypeError("fetch failed");
    if (typeof step === "function") return step(init ?? {});
    return new Response(null, { status: step });
  }) as typeof fetch;
  const run = (event = EVENT) =>
    deliverWinnieEvent(event, {
      url: URL_FAKE,
      key: KEY_FAKE,
      fetch: fakeFetch,
      sleep: async (ms) => {
        delays.push(ms);
      },
      timeoutMs,
      log: (line) => logs.push(line),
    });
  return { run, calls, delays, logs };
}

test("buildWinnieEvent gives Denver wall time with its offset, in any process TZ", () => {
  const summer = buildWinnieEvent(INPUT, new Date("2026-07-04T20:03:22.789Z"), "x");
  assert.equal(summer.occurredAt, "2026-07-04T14:03:22-06:00");
  const winter = buildWinnieEvent(INPUT, new Date("2026-11-06T21:03:22Z"), "x");
  assert.equal(winter.occurredAt, "2026-11-06T14:03:22-07:00");
});

test("buildWinnieEvent leaves optional fields out unless given; empty title throws", () => {
  const plain = buildWinnieEvent(INPUT, new Date(), "x");
  assert.equal("entityId" in plain, false);
  assert.equal("intendedRecipient" in plain, false);
  const full = buildWinnieEvent({ ...INPUT, entityId: "e1", intendedRecipient: "Bryce" }, new Date(), "x");
  assert.equal(full.entityId, "e1");
  assert.equal(full.intendedRecipient, "Bryce");
  assert.throws(() => buildWinnieEvent({ ...INPUT, title: "   " }, new Date()));
  assert.throws(() => buildWinnieEvent({ ...INPUT, type: "" }, new Date()));
  assert.throws(() => buildWinnieEvent({ ...INPUT, body: "" }, new Date()));
});

test("buildWinnieEvent makes a UUID eventId by default and keeps a passed one", () => {
  const made = buildWinnieEvent(INPUT, new Date());
  assert.match(made.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.equal(buildWinnieEvent(INPUT, new Date(), "mine").eventId, "mine");
});

test("shouldRetry retries network, timeout, 429 and 5xx only", () => {
  const status = (s: number): AttemptOutcome => ({ kind: "status", status: s });
  for (const s of [200, 400, 401, 404]) assert.equal(shouldRetry(status(s)), false, String(s));
  for (const s of [429, 500, 503]) assert.equal(shouldRetry(status(s)), true, String(s));
  assert.equal(shouldRetry({ kind: "network" }), true);
  assert.equal(shouldRetry({ kind: "timeout" }), true);
});

test("a 200 on the first try sends one POST with the right headers and body", async () => {
  const h = harness([200]);
  const result = await h.run();
  assert.deepEqual(result, { ok: true, status: 200, eventId: "abcd-1234", attempts: 1 });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, URL_FAKE);
  assert.equal(h.calls[0].init.method, "POST");
  assert.deepEqual(h.calls[0].init.headers, {
    "Content-Type": "application/json",
    Authorization: "Bearer test-key",
  });
  assert.deepEqual(JSON.parse(String(h.calls[0].init.body)), EVENT);
});

test("500, 500, 200 retries with the same bytes and waits 1 s then 3 s", async () => {
  const h = harness([500, 500, 200]);
  const result = await h.run();
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 3);
  assert.deepEqual(h.delays, [...WINNIE_RETRY_DELAYS_MS]);
  assert.deepEqual(h.delays, [1000, 3000]);
  const bodies = h.calls.map((c) => String(c.init.body));
  assert.equal(new Set(bodies).size, 1);
  assert.equal(JSON.parse(bodies[0]).eventId, "abcd-1234");
});

test("a 401 is rejected at once: one attempt, no sleep", async () => {
  const h = harness([401]);
  const result = await h.run();
  assert.deepEqual(result, { ok: false, reason: "rejected", status: 401, eventId: "abcd-1234", attempts: 1 });
  assert.deepEqual(h.delays, []);
});

test("503 three times is unreachable with the last status", async () => {
  const h = harness([503, 503, 503]);
  const result = await h.run();
  assert.deepEqual(result, { ok: false, reason: "unreachable", status: 503, eventId: "abcd-1234", attempts: 3 });
  assert.equal(h.calls.length, 3);
});

test("a network error then a 200 succeeds on attempt 2", async () => {
  const h = harness(["network", 200]);
  const result = await h.run();
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 2);
});

test("a fetch that never answers times out three times, with no status", async () => {
  const hang = (init: RequestInit) =>
    new Promise<Response>((_, reject) => {
      init.signal?.addEventListener("abort", () => {
        reject(new DOMException("aborted", "AbortError"));
      });
    });
  const h = harness([hang, hang, hang], 20);
  const result = await h.run();
  assert.deepEqual(result, { ok: false, reason: "unreachable", eventId: "abcd-1234", attempts: 3 });
  assert.equal(h.logs.every((l) => l.endsWith(": timeout")), true);
});

test("log lines carry the eventId and never the URL or the key", async () => {
  const h = harness([500, "network", 200]);
  await h.run();
  assert.equal(h.logs.length, 3);
  for (const line of h.logs) {
    assert.ok(line.includes("abcd-1234"));
    assert.ok(!line.includes("127.0.0.1"));
    assert.ok(!line.includes("test-key"));
  }
  assert.equal(h.logs[0], "winnie event abcd-1234 attempt 1/3: status 500");
  assert.equal(h.logs[1], "winnie event abcd-1234 attempt 2/3: network error");
});
