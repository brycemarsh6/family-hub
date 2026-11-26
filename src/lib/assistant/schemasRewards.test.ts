import { test } from "node:test";
import assert from "node:assert/strict";
import { REWARD_COST_REFUSAL, REWARD_NEEDS_COST_REFUSAL, REWARD_NAME_REFUSAL } from "@/lib/rewardVocabulary";
import {
  HOURS_NO_STARS,
  REWARD_NOT_HERS,
  REWARD_REDEEMED,
  adjustmentBody,
  newRewardInput,
  patchedRewardInput,
  rewardCreateBody,
  rewardPatchBody,
  rewardsHistoryQuery,
  rewardsQuery,
} from "./schemasRewards";

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

test("rewardCreateBody: personId and title are needed; cost may be left out or null; an unknown key is a 400", () => {
  assert.ok(ok(rewardCreateBody.safeParse({ personId: "a", title: "Movie" })));
  assert.ok(ok(rewardCreateBody.safeParse({ personId: "a", title: "Movie", emoji: null, cost: null, repeatable: false })));
  assert.ok(ok(rewardCreateBody.safeParse({ personId: "a", title: "Movie", emoji: "🎬", cost: 50, repeatable: true })));
  assert.ok(!ok(rewardCreateBody.safeParse({ title: "Movie" })));
  assert.ok(!ok(rewardCreateBody.safeParse({ personId: "a" })));
  assert.ok(!ok(rewardCreateBody.safeParse({ personId: "a", title: "Movie", cost: 12.5 })));
  assert.ok(!ok(rewardCreateBody.safeParse({ personId: "a", title: "Movie", cost: "50" })));
  assert.ok(!ok(rewardCreateBody.safeParse({ personId: "a", title: "Movie", createdById: "x" })));
});

test("rewardPatchBody: non-empty, the cost is a whole number and never null", () => {
  assert.ok(ok(rewardPatchBody.safeParse({ title: "New" })));
  assert.ok(ok(rewardPatchBody.safeParse({ cost: 50 })));
  assert.ok(ok(rewardPatchBody.safeParse({ emoji: null })));
  assert.ok(!ok(rewardPatchBody.safeParse({})));
  assert.ok(!ok(rewardPatchBody.safeParse({ cost: null })));
  assert.ok(!ok(rewardPatchBody.safeParse({ cost: 1.5 })));
  assert.ok(!ok(rewardPatchBody.safeParse({ ownerId: "b" })));
});

test("adjustmentBody: direction is give or take, amount a whole number, note a string or null", () => {
  assert.ok(ok(adjustmentBody.safeParse({ personId: "a", direction: "give", amount: 5 })));
  assert.ok(ok(adjustmentBody.safeParse({ personId: "a", direction: "take", amount: 10, note: null })));
  assert.ok(ok(adjustmentBody.safeParse({ personId: "a", direction: "take", amount: 10, note: "Late to bed" })));
  assert.ok(!ok(adjustmentBody.safeParse({ personId: "a", direction: "up", amount: 5 })));
  assert.ok(!ok(adjustmentBody.safeParse({ personId: "a", direction: "give", amount: 2.5 })));
  assert.ok(!ok(adjustmentBody.safeParse({ personId: "a", direction: "give" })));
  assert.ok(!ok(adjustmentBody.safeParse({ direction: "give", amount: 5 })));
  assert.ok(!ok(adjustmentBody.safeParse({ personId: "a", direction: "give", amount: 5, note: 3 })));
});

test("the three Winnie-only sentences are the ones Bryce approved", () => {
  assert.equal(REWARD_NOT_HERS, "Winnie can only delete a reward or wish she added herself.");
  assert.equal(REWARD_REDEEMED, "That reward has already been redeemed, so it can't be deleted.");
  assert.equal(HOURS_NO_STARS, "Hours habits don't pay stars.");
});

const create = (body: Record<string, unknown>) => newRewardInput(rewardCreateBody.parse({ personId: "a", title: "Movie", ...body }));

test("newRewardInput: a cost makes a reward, none (or null) makes a wish, owned by personId", () => {
  assert.deepEqual(create({ cost: 50 }), { kind: "reward", value: { title: "Movie", emoji: null, cost: 50, repeatable: false, ownerId: "a" } });
  assert.deepEqual(create({ cost: 50, repeatable: true, emoji: "🎬" }), { kind: "reward", value: { title: "Movie", emoji: "🎬", cost: 50, repeatable: true, ownerId: "a" } });
  assert.deepEqual(create({}), { kind: "wish", value: { title: "Movie", emoji: null, ownerId: "a" } });
  assert.deepEqual(create({ cost: null, repeatable: false }), { kind: "wish", value: { title: "Movie", emoji: null, ownerId: "a" } });
});

test("newRewardInput: repeatable with no cost, a cost off the list and a blank name are refused in the app's words", () => {
  assert.deepEqual(create({ repeatable: true }), { error: REWARD_NEEDS_COST_REFUSAL, code: "invalid" });
  assert.deepEqual(create({ cost: null, repeatable: true }), { error: REWARD_NEEDS_COST_REFUSAL, code: "invalid" });
  assert.deepEqual(create({ cost: 7 }), { error: REWARD_COST_REFUSAL, code: "invalid" });
  assert.deepEqual(create({ title: "  " }), { error: REWARD_NAME_REFUSAL, code: "invalid" });
  assert.deepEqual(create({ title: "  ", cost: 50 }), { error: REWARD_NAME_REFUSAL, code: "invalid" });
});

const card = (over: Partial<{ title: string; emoji: string | null; cost: number | null; repeatable: boolean }> = {}) => ({
  title: "Movie", emoji: null, cost: 50 as number | null, repeatable: false, ownerId: "a", ...over,
});
const patch = (current: ReturnType<typeof card>, body: Record<string, unknown>) => patchedRewardInput(current, rewardPatchBody.parse(body));

test("patchedRewardInput: a field left out keeps its value, the owner never changes", () => {
  assert.deepEqual(patch(card({ emoji: "🎬", repeatable: true }), { title: "Cinema" }), card({ title: "Cinema", emoji: "🎬", repeatable: true }));
  assert.deepEqual(patch(card(), { cost: 75 }), card({ cost: 75 }));
  assert.deepEqual(patch(card({ emoji: "🎬" }), { emoji: null }), card());
});

test("patchedRewardInput: a cost turns a wish into a reward", () => {
  assert.deepEqual(patch(card({ cost: null }), { cost: 25 }), card({ cost: 25 }));
  assert.deepEqual(patch(card({ cost: null }), { cost: 25, repeatable: true }), card({ cost: 25, repeatable: true }));
});

test("patchedRewardInput: a wish edit stays a wish; repeatable true on it is refused", () => {
  assert.deepEqual(patch(card({ cost: null }), { title: "Zoo" }), card({ cost: null, title: "Zoo" }));
  assert.deepEqual(patch(card({ cost: null }), { repeatable: true }), { error: REWARD_NEEDS_COST_REFUSAL, code: "invalid" });
  assert.deepEqual(patch(card({ cost: null }), { repeatable: false }), card({ cost: null }));
});

test("patchedRewardInput: the app's words for a bad name or a cost off the list", () => {
  assert.deepEqual(patch(card(), { title: " " }), { error: REWARD_NAME_REFUSAL, code: "invalid" });
  assert.deepEqual(patch(card(), { cost: 7 }), { error: REWARD_COST_REFUSAL, code: "invalid" });
  assert.deepEqual(patch(card({ cost: null }), { title: " " }), { error: REWARD_NAME_REFUSAL, code: "invalid" });
});
