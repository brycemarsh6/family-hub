// The words and limits of star rewards (mission 79, 81): the values a habit
// can pay, what a late check pays, what a reward can cost, and the refusal
// text. No imports, so any lib
// file may take words from it without risking a cycle (the same rule as
// habitVocabulary.ts).

/** The star values a habit or chore can pay, in the order the stepper walks them. Not having stars is null. */
export const STAR_STEPS = [1, 2, 3, 4, 5, 10, 15, 20, 25, 50] as const;
export type StarStep = (typeof STAR_STEPS)[number];

/** Anything not on the list, including 0, is null: no stars. */
export function toStarValue(raw: unknown): StarStep | null {
  return STAR_STEPS.find((step) => step === raw) ?? null;
}

export const STAR_REFUSAL = "Pick a star value from the list.";

/** What a late check pays: all the stars, half (rounded up), or none. */
export const LATE_STARS = ["full", "half", "none"] as const;
export type LateStars = (typeof LATE_STARS)[number];

export const LATE_STARS_LABELS: Record<LateStars, string> = {
  full: "Full stars",
  half: "Half stars",
  none: "No stars",
};

/** Anything unknown is "full", the default. */
export function toLateStars(raw: unknown): LateStars {
  return LATE_STARS.find((choice) => choice === raw) ?? "full";
}

/** The stepper's field on the habit form. */
export const STARS_FIELD_LABEL = "Stars";
export const STARS_FIELD_HINT = "Paid into the star bank each time it's checked off";

/** "1 star", "-1 star", "10 stars" (a minus is a take-back). */
export function starCountText(n: number): string {
  return n === 1 || n === -1 ? `${n} star` : `${n} stars`;
}

/** What sits between the stepper's buttons: "None" for no stars, else the count. */
export function starStepText(value: number | null): string {
  return value === null ? "None" : starCountText(value);
}

/** The Rewards section in Settings and its Late checks choice. */
export const REWARDS_SETTINGS_TITLE = "Rewards";
export const LATE_STARS_TITLE = "Late checks";
export const LATE_STARS_HELP = "A late check is a carried-over item checked off the next day. Half rounds up.";
export const LATE_STARS_REFUSAL = "Only parents and admins can change this.";
export const LATE_STARS_OFF_LIST = "That choice isn't on the list.";

/** What a reward can cost, in the order the cost stepper walks them. Not having a cost is null (a wish, R4). */
export const COST_STEPS = [
  5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000,
] as const;
export type CostStep = (typeof COST_STEPS)[number];

/** Anything not on the list is null: no valid cost. */
export function toRewardCost(raw: unknown): CostStep | null {
  return COST_STEPS.find((step) => step === raw) ?? null;
}

/** A new reward starts here. */
export const DEFAULT_REWARD_COST = 20;
export const REWARD_TITLE_MAX = 60;

/** The Rewards page and its sheet's fields. */
export const REWARDS_PAGE_TITLE = "Rewards";
export const REWARD_ADD_LABEL = "Add reward";
export const REWARD_PICTURE_LABEL = "Picture";
export const REWARD_NAME_LABEL = "Name";
export const REWARD_COST_LABEL = "Cost";
export const REWARD_REPEAT_LABEL = "After it's redeemed";
export const REWARD_ONE_TIME_LABEL = "One time";
export const REWARD_REPEATABLE_LABEL = "Repeatable";
export const REWARD_OWNER_LABEL = "For";
export const REWARD_NO_PICTURE_LABEL = "No picture";
export const REWARD_REPEATS_TAG = "Repeats";
export const REWARD_EARNED_LABEL = "Earned";
export const REWARD_HIDE_EARNED_LABEL = "Hide earned";
export const REWARD_ASK_A_PARENT = "Ask a parent";
export const REWARD_CANCEL_LABEL = "Cancel";
export const REWARD_DONE_LABEL = "Done";
export const REWARD_UNDO_LABEL = "Undo redeem";
export const REWARD_CELEBRATION_HEADING = "Great work!";
export const REWARD_REDEEM_LABEL = "Redeem";
export const REWARD_NO_COST_LABEL = "No cost yet";
export const REWARD_EDIT_HEADING = "Edit reward";
export const REWARD_REDEEM_HEADING = "Redeem reward";
export const REWARD_REDEEMED_HEADING = "Reward redeemed";

/** What a button says while its call runs. */
export const REWARD_SAVING_LABEL = "Saving…";
export const REWARD_DELETING_LABEL = "Deleting…";
export const REWARD_REDEEMING_LABEL = "Redeeming…";
export const REWARD_UNDOING_LABEL = "Undoing…";

/** An empty person's column: parents are offered the Add tile, others are pointed to one. */
export const REWARD_EMPTY_PARENT = "No rewards yet.";
export const REWARD_EMPTY_OTHER = "No rewards yet. Ask a parent to add one.";
/** A person who has rewards, all of them earned and hidden by Hide earned. */
export const REWARD_ALL_HIDDEN = "Earned rewards are hidden.";
/** The phone's row of people. */
export const REWARD_PEOPLE_LABEL = "People";

/** The Any emoji tile: it opens the device's emoji keyboard. */
export const ANY_EMOJI_LABEL = "Any emoji";
export const ANY_EMOJI_HINT = "Tap the smiley or globe key for emoji";

/** Refusals. */
export const REWARD_NAME_REFUSAL = "Give the reward a name.";
export const REWARD_COST_REFUSAL = "Pick a cost from the list.";
export const REWARD_EMOJI_REFUSAL = "Pick an emoji, or No picture.";
export const REWARD_NOT_EMOJI_REFUSAL = "That isn't an emoji.";
export const REWARD_PARENT_REFUSAL = "Only parents and admins can do this.";
export const REWARD_GONE_REFUSAL = "That reward is gone.";
export const REWARD_EARNED_REFUSAL = "Already earned.";
export const REWARD_NEEDS_COST_REFUSAL = "This reward needs a cost first.";
export const REWARD_SAVE_FAILED = "That didn't save. Please try again.";

/** "Ellie needs 15 more stars." */
export function notEnoughStarsText(name: string, short: number): string {
  return `${name} needs ${short} more ${short === 1 ? "star" : "stars"}.`;
}

/** The redeem sheet's question: "Redeem Cupcake for Ellie?" */
export function redeemQuestionText(title: string, name: string): string {
  return `Redeem ${title} for ${name}?`;
}

/** The redeem sheet's spend line: "This spends 20 of Ellie's 55 stars. 35 left after." */
export function redeemSpendText(cost: number, name: string, bank: number): string {
  return `This spends ${cost} of ${name}'s ${bank} stars. ${bank - cost} left after.`;
}

/** The redeem button: "Redeem 20 stars". */
export function redeemButtonText(cost: number): string {
  return `Redeem ${starCountText(cost)}`;
}

/** The celebration's second line: "Cupcake redeemed." */
export function redeemedTitleText(title: string): string {
  return `${title} redeemed.`;
}

/** The celebration's third line: "By Ellie for 20 stars on Tuesday, November 24." */
export function redeemedByText(name: string, cost: number, dateText: string): string {
  return `By ${name} for ${starCountText(cost)} on ${dateText}.`;
}

/** A card's progress: "55 of 150" (a negative bank reads 0). */
export function progressText(bank: number, cost: number): string {
  return `${Math.max(bank, 0)} of ${cost}`;
}

/** A person chip's spoken name: "Ellie, 55 stars". */
export function personChipLabel(name: string, bank: number): string {
  return `${name}, ${starCountText(bank)}`;
}

/** A card's progress bar label: "Cupcake progress". */
export function rewardProgressLabel(title: string): string {
  return `${title} progress`;
}

/** A card's Redeem button name for a screen reader: "Redeem Cupcake". */
export function rewardRedeemAriaLabel(title: string): string {
  return `${REWARD_REDEEM_LABEL} ${title}`;
}

/** The phone's Add tile: "Add reward for Ellie". */
export function addRewardForText(name: string): string {
  return `${REWARD_ADD_LABEL} for ${name}`;
}

/** The Celebrations switch (mission 80): on a login's Settings and on the Wall tablet page. */
export const CELEBRATIONS_WORDS = {
  title: "Celebrations",
  sub: "Flying stars and the all-done confetti",
  saveError: "Couldn't save your celebrations setting. Check your connection and try again.",
  notAllowed: "Only parents, admins and the wall tablet can change this.",
  deviceRefused: "A shared device changes this on Wall tablet settings.",
} as const;

// R5 (mission 83): Manage rewards, bonus and taken stars, and star history.

/** Manage page and its sections. */
export const MANAGE_BUTTON_LABEL = "Manage";
export const MANAGE_PAGE_TITLE = "Manage rewards";
export const ADJUST_SECTION_TITLE = "Give or take stars";
export const RECENT_SECTION_TITLE = "Recent";
export const NO_WISHES_TEXT = "No wishes waiting.";
export const NO_RECENT_TEXT = "Nothing in the last 30 days.";
export const SET_COST_LABEL = "Set cost";
export const RECENT_UNDO_LABEL = "Undo";

/** "Wishes waiting for a cost (2)" */
export function wishesTitleText(count: number): string {
  return `Wishes waiting for a cost (${count})`;
}

/** "Ellie's wish" */
export function wishOfText(name: string): string {
  return `${name}'s wish`;
}

/** The give or take form's fields and buttons. */
export const ADJUST_GIVE_LABEL = "Give";
export const ADJUST_TAKE_LABEL = "Take away";
export const ADJUST_NOTE_LABEL = "What for? (optional)";
export const ADJUSTING_LABEL = "Saving…";

/** "Give Ellie 5 stars" */
export function giveButtonText(name: string, stars: number): string {
  return `Give ${name} ${starCountText(stars)}`;
}

/** "Take 5 stars from Ellie" */
export function takeButtonText(name: string, stars: number): string {
  return `Take ${starCountText(stars)} from ${name}`;
}

/** Refusals for a bonus or taken star line. */
export const ADJUST_AMOUNT_REFUSAL = "Pick a number of stars from the list.";
export const ADJUST_DIRECTION_REFUSAL = "Choose Give or Take away.";
export const ADJUST_NOTE_REFUSAL = "Keep the note to 60 letters or fewer.";
export const ADJUST_PERSON_REFUSAL = "Pick a person from the family.";

/** Star history. */
export const HISTORY_TODAY = "Today";
export const HISTORY_YESTERDAY = "Yesterday";
export const HISTORY_LATE_SUB = "Late";
export const HISTORY_PRIVATE_HABIT = "A private habit";
export const HISTORY_FOOTER = "Showing the last 30 days. Older stars still count in the total.";
export const HISTORY_EMPTY = "No stars in the last 30 days.";
export const HISTORY_LOADING = "Loading…";
export const HISTORY_FAILED = "Couldn't load the star history. Please try again.";
export const BONUS_NO_GIVER = "Bonus stars";
export const TAKEN_NO_GIVER = "Stars taken away";

/** "Ellie's stars" (the history sheet's title) */
export function historyTitleText(name: string): string {
  return `${name}'s stars`;
}

/** "Ellie's star history" (the link and the wide bank button's label) */
export function historyLinkText(name: string): string {
  return `${name}'s star history`;
}

/** "Bonus from Dad" */
export function bonusFromText(giver: string | null): string {
  return giver === null ? BONUS_NO_GIVER : `Bonus from ${giver}`;
}

/** "Taken away by Dad" */
export function takenByText(giver: string | null): string {
  return giver === null ? TAKEN_NO_GIVER : `Taken away by ${giver}`;
}

/** "Redeemed Cupcake" */
export function historyRedeemedText(title: string): string {
  return `Redeemed ${title}`;
}

/** "+5" or "-20": a signed star amount (a plain hyphen, the starCountText rule). */
export function signedStarsText(amount: number): string {
  return amount > 0 ? `+${amount}` : `${amount}`;
}

/** Manage's Recent list titles: "Cupcake redeemed", "Bonus: Cleaned the garage". */
export function recentRedeemedTitle(title: string): string {
  return `${title} redeemed`;
}
export function recentBonusTitle(note: string | null): string {
  return note === null ? BONUS_NO_GIVER : `Bonus: ${note}`;
}
export function recentTakenTitle(note: string | null): string {
  return note === null ? TAKEN_NO_GIVER : `Taken away: ${note}`;
}

/** "Ellie · 20 stars · Today" */
export function recentRedeemSub(name: string, cost: number, day: string): string {
  return `${name} · ${starCountText(cost)} · ${day}`;
}

/** "Ellie · +5 from Dad · Today" (no giver: "Ellie · +5 · Today") */
export function recentAdjustSub(name: string, amount: number, giver: string | null, day: string): string {
  return `${name} · ${signedStarsText(amount)}${giver === null ? "" : ` from ${giver}`} · ${day}`;
}
