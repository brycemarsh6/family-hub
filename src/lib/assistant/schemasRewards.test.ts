import { test } from "node:test";
import assert from "node:assert/strict";
import { rewardsHistoryQuery, rewardsQuery } from "./schemasRewards";

const ok = (r: { success: boolean }) => r.success;

test("rewardsQuery: personId is optional, any other key is a 400", () => {
  assert.ok(ok(rewardsQuery.safeParse({})));
  assert.ok(ok(rewardsQuery.safeParse({ personId: "emily" })));
  assert.ok(!ok(rewardsQuery.safeParse({ personId: "" })));
  assert.ok(!ok(rewardsQuery.safeParse({ person: "emily" })));
});

test("rewardsHistoryQuery: personId is required, any other key is a 400", () => {
  assert.ok(ok(rewardsHistoryQuery.safeParse({ personId: "emily" })));
  assert.ok(!ok(rewardsHistoryQuery.safeParse({})));
  assert.ok(!ok(rewardsHistoryQuery.safeParse({ personId: "" })));
  assert.ok(!ok(rewardsHistoryQuery.safeParse({ personId: "emily", days: "7" })));
});
