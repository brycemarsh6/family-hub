import { adjustmentBody, rewardCreateBody, rewardPatchBody, rewardsHistoryQuery, rewardsQuery } from "./schemasRewards";
import type { Operation } from "./openapiTypes";
import { COST_STEPS, STAR_STEPS } from "@/lib/rewardVocabulary";

// The registry rows for the Rewards routes. Adding a route means
// adding its row here; openapi.test.ts fails until you do.

const NEVER = "She never redeems a reward and never sees or changes the parent PIN.";

const WHO =
  "Winnie sees every active household person's stars (the family's tablet login and deactivated people are left out). " +
  "personId must be an active household person (GET /family), else 404. " + NEVER;

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
      "Use it to say who redeemed what or who was given stars. It is household-wide, like the app's Manage page: " +
      "a line can name someone who has since been deactivated. " + NEVER,
    response: "{ lines: [{ id, kind (redeem | bonus | take), title, sub, emoji | null }] }.",
  },
  {
    method: "POST",
    path: "/rewards",
    action: "rewards.create",
    summary:
      "Add a reward or a wish for a person (personId). Give a cost and it is a reward; leave the cost out (or null) and it is a wish, a card waiting for a parent to set its cost. " +
      `cost is a whole number from the app's list: ${COST_STEPS.join(", ")} (anything else is 400 with the app's words). ` +
      "title is up to 60 letters; emoji is one picture or null; repeatable (default false) needs a cost (repeatable: true with no cost is 400). She never redeems it. " + NEVER + " Undoable (undo removes it, unless it has been redeemed).",
    body: rewardCreateBody,
    response:
      "201 { person: { personId, name, stars }, reward: as one reward in GET /rewards }. 404 for an unknown personId. 400 for anything the reward sheet would refuse.",
  },
  {
    method: "PATCH",
    path: "/rewards/{id}",
    action: "rewards.update",
    summary:
      "Change any of title, emoji, cost, repeatable (what is left out stays as it is). Setting a cost on a wish turns it into a reward; a cost is a number, never null (a reward can't go back to a wish). " +
      "cost comes from the same list as POST /rewards. Works on rewards the family made too. A change that changes nothing answers 200 and records nothing. She never redeems it. " + NEVER + " Undoable.",
    body: rewardPatchBody,
    response:
      "{ person: { personId, name, stars }, reward: as one reward in GET /rewards }. 400 for anything the reward sheet would refuse (a repeating card with no cost included). 404 if missing.",
  },
  {
    method: "DELETE",
    path: "/rewards/{id}",
    action: "rewards.delete",
    summary:
      "Delete a reward or wish that Winnie added herself (ones the family made are theirs: 403). One that has been redeemed can't be deleted (409). Ids are in GET /rewards. " + NEVER + " Undoable (undo puts it back).",
    response: "{ removed: true }. 403 forbidden for one she didn't add. 409 conflict when it has been redeemed. 404 if missing.",
  },
  {
    method: "POST",
    path: "/rewards/adjustments",
    action: "rewards.adjust",
    summary:
      `Give a person stars or take some away, with an optional note (up to 60 letters). direction is give or take; amount is a positive whole number from the star list: ${STAR_STEPS.join(", ")}. ` +
      "The family sees it in star history as coming from Winnie. A bank may go below zero. " + WHO + " Undoable (undo puts the bank back).",
    body: adjustmentBody,
    response:
      "201 { adjustment: { id, personId, amount (signed), note | null, createdAt }, person: { personId, name, stars } }. 404 for an unknown personId. 400 for an amount off the list or a note that is too long.",
  },
];
