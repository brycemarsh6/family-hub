import { rewardsHistoryQuery, rewardsQuery } from "./schemasRewards";
import type { Operation } from "./openapiTypes";

// The registry rows for the Rewards routes (reads only). Adding a route means
// adding its row here; openapi.test.ts fails until you do.

const WHO =
  "Winnie sees every active household person's stars (the family's tablet login and deactivated people are left out). " +
  "personId must be an active household person (GET /family), else 404. " +
  "She never redeems a reward and never sees or changes the parent PIN.";

export const rewardOperations: Operation[] = [
  {
    method: "GET",
    path: "/rewards",
    action: "rewards.list",
    summary:
      "Each person's star bank and their rewards, in household order (one person when personId is given). " +
      "A reward's status is earned (a one-time reward already redeemed, listed last), wish (no cost yet), ready (the bank covers the cost, so the person can redeem it in the app) or saving; " +
      "progress is the words for a saving one (\"45 of 50\"), else null. cost is null for a wish. createdByAssistant is true for rewards Winnie made. " +
      "lateStars is the household's Late checks setting (full, half or none): what a late check pays. " + WHO,
    query: rewardsQuery,
    response:
      "{ lateStars, people: [{ personId, name, stars, rewards: [{ id, title, emoji | null, cost | null, repeatable, timesRedeemed, " +
      "status (earned | wish | ready | saving), progress | null, createdByAssistant }] }] }. 404 for an unknown personId.",
  },
  {
    method: "GET",
    path: "/rewards/history",
    action: "rewards.history",
    summary:
      "One person's last 30 days of star lines, newest day first, plus their bank. A line is a check, a late check, a redeem, a bonus or a take-away; amount is signed. " +
      "A check on someone else's private habit reads \"A private habit\". personId is required. " + WHO,
    query: rewardsHistoryQuery,
    response:
      "{ personId, name, stars, days: [{ date, label, lines: [{ id, kind (check | late | redeem | bonus | take), text, sub | null, amount, emoji | null }] }] }. " +
      "400 without personId. 404 for an unknown personId.",
  },
  {
    method: "GET",
    path: "/rewards/recent",
    action: "rewards.recent",
    summary:
      "The household's recent redeems and bonuses (stars given or taken away), newest first, from the last 30 days, at most 100. " +
      "Use it to say who redeemed what or who was given stars. " + WHO,
    response: "{ lines: [{ id, kind (redeem | bonus | take), title, sub, emoji | null }] }.",
  },
];
