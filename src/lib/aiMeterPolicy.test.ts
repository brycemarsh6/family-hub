import test from "node:test";
import assert from "node:assert/strict";
import {
  MICRO_USD_PER_CENT,
  aiAccess,
  aiMonthWindow,
  costMicroUsd,
  parseAllowanceCents,
  parseUpgradeUrl,
  percentUsed,
} from "./aiMeterPolicy";
import { formatUsd } from "./aiMeterVocabulary";

const SONNET = "claude-sonnet-5-5";

test("Sonnet 5.5: $2 in, $10 out per million tokens", () => {
  assert.equal(costMicroUsd(SONNET, { input_tokens: 1_000_000, output_tokens: 0 }), 2_000_000);
  assert.equal(costMicroUsd(SONNET, { input_tokens: 0, output_tokens: 1_000_000 }), 10_000_000);
  assert.equal(costMicroUsd(SONNET, { input_tokens: 1000, output_tokens: 500 }), 2000 + 5000);
});

test("Opus 5.5: $4 in, $20 out per million tokens", () => {
  assert.equal(costMicroUsd("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 1_000_000 }), 24_000_000);
});

test("Haiku 5.5: $0.10 in, $0.50 out per million tokens, with no float drift", () => {
  assert.equal(costMicroUsd("claude-haiku-5-5", { input_tokens: 1_000_000, output_tokens: 0 }), 100_000);
  assert.equal(costMicroUsd("claude-haiku-5-5", { input_tokens: 0, output_tokens: 1_000_000 }), 500_000);
});

test("a dated model id still matches its family", () => {
  assert.equal(
    costMicroUsd("claude-sonnet-5-5-20261101", { input_tokens: 1_000_000, output_tokens: 0 }),
    2_000_000,
  );
});

test("an unknown model is priced as the most expensive row", () => {
  const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000 };
  assert.equal(costMicroUsd("claude-mystery-9", usage), 60_000_000);
  assert.ok(costMicroUsd("claude-mystery-9", usage) > costMicroUsd(SONNET, usage));
});

test("an unknown model costs at least as much as every listed row, on every token type", () => {
  const usage = {
    input_tokens: 1_000_000,
    output_tokens: 1_000_000,
    cache_read_input_tokens: 1_000_000,
    cache_creation_input_tokens: 1_000_000,
  };
  const unknown = costMicroUsd("claude-mystery-9", usage);
  for (const model of ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"]) {
    assert.ok(unknown >= costMicroUsd(model, usage), model);
  }
});

test("cache read and write tokens are priced on their own rows", () => {
  assert.equal(
    costMicroUsd(SONNET, {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
    }),
    100_000 + 2_500_000,
  );
  assert.equal(
    costMicroUsd("claude-opus-5-5", {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
    }),
    200_000 + 5_000_000,
  );
  assert.equal(
    costMicroUsd("claude-haiku-5-5", {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
    }),
    10_000 + 125_000,
  );
});

test("null or missing cache fields count as zero", () => {
  const plain = costMicroUsd(SONNET, { input_tokens: 1234, output_tokens: 567 });
  assert.equal(
    costMicroUsd(SONNET, {
      input_tokens: 1234,
      output_tokens: 567,
      cache_read_input_tokens: null,
      cache_creation_input_tokens: null,
    }),
    plain,
  );
});

test("cost rounds up once per call, never down to zero for a real call", () => {
  // 1 input token = 2000 nano = 2 micro; 1 cache-read token = 100 nano, rounds up to 1 micro.
  assert.equal(costMicroUsd(SONNET, { input_tokens: 1, output_tokens: 0 }), 2);
  assert.equal(costMicroUsd(SONNET, { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1 }), 1);
  assert.equal(costMicroUsd(SONNET, { input_tokens: 0, output_tokens: 0 }), 0);
  // Two cache-read tokens in one call (200 nano) round once, to 1, not 1 + 1.
  assert.equal(costMicroUsd(SONNET, { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 2 }), 1);
});

test("a typical recipe import is a few cents on Sonnet", () => {
  const micro = costMicroUsd(SONNET, { input_tokens: 6000, output_tokens: 2500 });
  assert.equal(micro, 12_000 + 25_000);
  assert.equal(formatUsd(micro), "$0.04");
});

test("month window in Denver: mid-month in November (standard time)", () => {
  const w = aiMonthWindow(new Date("2026-11-26T18:00:00Z"), "America/Denver");
  assert.equal(w.start.toISOString(), "2026-11-01T06:00:00.000Z"); // MDT until Nov 1 2am
  assert.equal(w.end.toISOString(), "2026-12-01T07:00:00.000Z");
  assert.deepEqual(w.resetsOn, { year: 2026, month: 12, day: 1 });
});

test("month window in Denver: December rolls to January of the next year", () => {
  const w = aiMonthWindow(new Date("2026-12-31T23:30:00-07:00"), "America/Denver");
  assert.equal(w.start.toISOString(), "2026-12-01T07:00:00.000Z");
  assert.equal(w.end.toISOString(), "2027-01-01T07:00:00.000Z");
  assert.deepEqual(w.resetsOn, { year: 2027, month: 1, day: 1 });
});

test("month window uses the household's date, not UTC's: late on the 30th in Denver is already Dec 1 UTC", () => {
  // 2026-12-01T03:00Z is still Nov 30 in Denver.
  const w = aiMonthWindow(new Date("2026-12-01T03:00:00Z"), "America/Denver");
  assert.deepEqual(w.resetsOn, { year: 2026, month: 12, day: 1 });
  assert.equal(w.start.toISOString(), "2026-11-01T06:00:00.000Z");
});

test("month window in Denver across a DST change (March: spring forward on the 8th)", () => {
  const w = aiMonthWindow(new Date("2026-03-15T12:00:00Z"), "America/Denver");
  assert.equal(w.start.toISOString(), "2026-03-01T07:00:00.000Z"); // MST
  assert.equal(w.end.toISOString(), "2026-04-01T06:00:00.000Z"); // MDT
  assert.deepEqual(w.resetsOn, { year: 2026, month: 4, day: 1 });
});

test("month window in Pacific/Auckland: ahead of UTC", () => {
  // 2026-11-30T12:00Z is Dec 1 01:00 in Auckland (NZDT, UTC+13).
  const w = aiMonthWindow(new Date("2026-11-30T12:00:00Z"), "Pacific/Auckland");
  assert.equal(w.start.toISOString(), "2026-11-30T11:00:00.000Z");
  assert.equal(w.end.toISOString(), "2026-12-31T11:00:00.000Z");
  assert.deepEqual(w.resetsOn, { year: 2027, month: 1, day: 1 });
});

test("month window in Pacific/Auckland across a DST change (April: ends on the 5th)", () => {
  const w = aiMonthWindow(new Date("2026-04-20T00:00:00Z"), "Pacific/Auckland");
  assert.equal(w.start.toISOString(), "2026-03-31T11:00:00.000Z"); // NZDT, UTC+13
  assert.equal(w.end.toISOString(), "2026-04-30T12:00:00.000Z"); // NZST, UTC+12
  assert.deepEqual(w.resetsOn, { year: 2026, month: 5, day: 1 });
});

test("the window holds `now` and starts on or before it", () => {
  const now = new Date("2026-07-04T15:00:00Z");
  const w = aiMonthWindow(now, "America/Denver");
  assert.ok(w.start.getTime() <= now.getTime());
  assert.ok(now.getTime() < w.end.getTime());
});

test("parseAllowanceCents: whole numbers pass, everything else is 0", () => {
  assert.equal(parseAllowanceCents("300"), 300);
  assert.equal(parseAllowanceCents(" 300 "), 300);
  assert.equal(parseAllowanceCents("0"), 0);
  assert.equal(parseAllowanceCents(undefined), 0);
  assert.equal(parseAllowanceCents(null), 0);
  assert.equal(parseAllowanceCents(""), 0);
  assert.equal(parseAllowanceCents("   "), 0);
  assert.equal(parseAllowanceCents("-5"), 0);
  assert.equal(parseAllowanceCents("3.5"), 0);
  assert.equal(parseAllowanceCents("$3"), 0);
  assert.equal(parseAllowanceCents("three"), 0);
  assert.equal(parseAllowanceCents("1e3"), 0);
  assert.equal(parseAllowanceCents("99999999999999999999"), 0);
});

test("parseUpgradeUrl: only a trimmed https URL that parses", () => {
  assert.equal(parseUpgradeUrl("https://buy.stripe.com/abc123"), "https://buy.stripe.com/abc123");
  assert.equal(parseUpgradeUrl("  https://buy.stripe.com/abc123  "), "https://buy.stripe.com/abc123");
  assert.equal(parseUpgradeUrl(undefined), null);
  assert.equal(parseUpgradeUrl(null), null);
  assert.equal(parseUpgradeUrl(""), null);
  assert.equal(parseUpgradeUrl("http://buy.stripe.com/abc"), null);
  assert.equal(parseUpgradeUrl("javascript:alert(1)"), null);
  assert.equal(parseUpgradeUrl("buy.stripe.com/abc"), null);
  assert.equal(parseUpgradeUrl("https://"), null);
  assert.equal(parseUpgradeUrl("https://bad host/x"), null);
});

test("aiAccess: the owner's copy always may", () => {
  assert.equal(aiAccess({ isOwner: true, allowanceCents: 0, usedMicroUsd: 0 }), "allow");
  assert.equal(aiAccess({ isOwner: true, allowanceCents: 300, usedMicroUsd: 999_999_999 }), "allow");
});

test("aiAccess: no allowance is locked, even with nothing used", () => {
  assert.equal(aiAccess({ isOwner: false, allowanceCents: 0, usedMicroUsd: 0 }), "locked");
});

test("aiAccess: room left allows, exactly at the allowance and over are used up", () => {
  const limit = 300 * MICRO_USD_PER_CENT;
  assert.equal(aiAccess({ isOwner: false, allowanceCents: 300, usedMicroUsd: 0 }), "allow");
  assert.equal(aiAccess({ isOwner: false, allowanceCents: 300, usedMicroUsd: limit - 1 }), "allow");
  assert.equal(aiAccess({ isOwner: false, allowanceCents: 300, usedMicroUsd: limit }), "used-up");
  assert.equal(aiAccess({ isOwner: false, allowanceCents: 300, usedMicroUsd: limit + 1 }), "used-up");
});

test("percentUsed: edges", () => {
  const limit = 300 * MICRO_USD_PER_CENT;
  assert.equal(percentUsed(0, 300), 0);
  assert.equal(percentUsed(limit * 0.4, 300), 40);
  assert.equal(percentUsed(limit - 1, 300), 99); // just under never shows 100
  assert.equal(percentUsed(limit, 300), 100);
  assert.equal(percentUsed(limit * 2, 300), 100);
  assert.equal(percentUsed(0, 0), 0);
  assert.equal(percentUsed(5_000_000, 0), 0);
  assert.equal(percentUsed(limit * 0.019, 300), 1); // floor
});
