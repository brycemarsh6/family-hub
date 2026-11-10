import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deleteEvent, getEvent, insertEvent, updateEvent, type FetchLike } from "./calendarEventCalls";
import { toGoogleEvent } from "./eventPayload";

// Every test passes a fake fetch. Nothing here reaches Google.

const TOKEN = "ya29.SECRET-ACCESS-TOKEN";
const payload = toGoogleEvent({
  marsheeEventId: "cmabc",
  title: "Dentist",
  notes: null,
  location: null,
  startAt: new Date("2026-03-07T19:00:00Z"),
  endAt: new Date("2026-03-07T20:00:00Z"),
  allDay: false,
  showBusyOnGoogle: false,
  forNames: [],
});

type Seen = { url: string; init: RequestInit };

function fake(status: number, body: unknown): { fetchFn: FetchLike; seen: Seen[] } {
  const seen: Seen[] = [];
  const fetchFn: FetchLike = async (url, init) => {
    seen.push({ url, init });
    return new Response(status === 204 ? null : JSON.stringify(body), { status });
  };
  return { fetchFn, seen };
}

const calls = {
  insert: (f: FetchLike) => insertEvent(f, TOKEN, "a@b.com", "abc123", payload),
  update: (f: FetchLike) => updateEvent(f, TOKEN, "a@b.com", "abc123", payload, '"etag1"'),
  delete: (f: FetchLike) => deleteEvent(f, TOKEN, "a@b.com", "abc123"),
  get: (f: FetchLike) => getEvent(f, TOKEN, "a@b.com", "abc123"),
};

describe("event calls: requests", () => {
  it("insert POSTs to the encoded calendar with sendUpdates=none and the chosen id", async () => {
    const { fetchFn, seen } = fake(200, { etag: '"e1"' });
    const r = await calls.insert(fetchFn);
    assert.deepEqual(r, { ok: true, etag: '"e1"' });
    assert.equal(seen[0].url, "https://www.googleapis.com/calendar/v3/calendars/a%40b.com/events?sendUpdates=none");
    assert.equal(seen[0].init.method, "POST");
    assert.equal(JSON.parse(seen[0].init.body as string).id, "abc123");
    assert.equal((seen[0].init.headers as Record<string, string>).Authorization, `Bearer ${TOKEN}`);
    assert.ok(seen[0].init.signal);
  });

  it("update PUTs to the event with If-Match when given", async () => {
    const { fetchFn, seen } = fake(200, { etag: '"e2"' });
    const r = await calls.update(fetchFn);
    assert.deepEqual(r, { ok: true, etag: '"e2"' });
    assert.equal(
      seen[0].url,
      "https://www.googleapis.com/calendar/v3/calendars/a%40b.com/events/abc123?sendUpdates=none",
    );
    assert.equal(seen[0].init.method, "PUT");
    assert.equal((seen[0].init.headers as Record<string, string>)["If-Match"], '"etag1"');
  });

  it("update sends no If-Match when none is given", async () => {
    const { fetchFn, seen } = fake(200, {});
    await updateEvent(fetchFn, TOKEN, "a@b.com", "abc123", payload);
    assert.equal("If-Match" in (seen[0].init.headers as Record<string, string>), false);
  });

  it("delete sends DELETE with no If-Match and no body", async () => {
    const { fetchFn, seen } = fake(204, null);
    const r = await calls.delete(fetchFn);
    assert.deepEqual(r, { ok: true, etag: null });
    assert.equal(seen[0].init.method, "DELETE");
    assert.equal("If-Match" in (seen[0].init.headers as Record<string, string>), false);
    assert.equal(seen[0].init.body, undefined);
  });

  it("get returns the event and its etag", async () => {
    const { fetchFn, seen } = fake(200, { etag: '"e3"', summary: "Dentist" });
    const r = await calls.get(fetchFn);
    assert.equal(seen[0].init.method, "GET");
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.etag, '"e3"');
      assert.equal(r.event.summary, "Dentist");
    }
  });

  it("succeeds with a null etag when Google's reply has none", async () => {
    const { fetchFn } = fake(200, {});
    assert.deepEqual(await calls.insert(fetchFn), { ok: true, etag: null });
  });
});

describe("event calls: status codes", () => {
  const expected: Array<[number, string]> = [
    [409, "conflict"],
    [412, "changed"],
    [404, "gone"],
    [410, "gone"],
    [401, "unauthorized"],
    [403, "unauthorized"],
    [500, "network"],
    [503, "network"],
    [429, "network"],
    [400, "network"],
  ];
  for (const [name, call] of Object.entries(calls)) {
    for (const [status, reason] of expected) {
      it(`${name} maps ${status} to ${reason}`, async () => {
        const { fetchFn } = fake(status, { error: { message: `leak ${TOKEN}` } });
        assert.deepEqual(await call(fetchFn), { ok: false, reason });
      });
    }
  }

  it("maps a thrown fetch to network and drops the error", async () => {
    const boom: FetchLike = async () => {
      throw new Error(`failed with Authorization: Bearer ${TOKEN}`);
    };
    for (const call of Object.values(calls)) {
      const r = await call(boom);
      assert.deepEqual(r, { ok: false, reason: "network" });
      assert.equal(JSON.stringify(r).includes(TOKEN), false);
    }
  });

  it("get maps an unreadable body to network", async () => {
    const bad: FetchLike = async () => new Response("not json", { status: 200 });
    assert.deepEqual(await calls.get(bad), { ok: false, reason: "network" });
  });
});
