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
export const REWARD_CANCEL_LABEL = "Cancel";
export const REWARD_CLOSE_LABEL = "Close";
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

/** The parent PIN (mission 82, Rewards R4). */
export const PIN_TITLE = "Parent PIN";
export const PIN_SWITCH_LABEL = "Ask for the PIN";
export const PIN_HELP = "Kids and the wall tablet need the PIN to redeem. A parent's own login is never asked.";
export const PIN_IS_SET = "PIN is set";
export const PIN_NOT_SET = "No PIN yet";
export const PIN_CHANGE_LABEL = "Change PIN";
export const PIN_SET_LABEL = "Set PIN";
export const PIN_SHEET_HEADING = "Set a new PIN";
export const PIN_SHEET_HINT = "Pick 4 digits. Kids shouldn't know it.";
export const PIN_CONFIRM_HEADING = "Enter it again";
export const PIN_MISMATCH = "Those didn't match. Start again.";
export const PIN_SAVED = "PIN saved.";
export const PIN_WRONG = "That PIN isn't right.";
export const PIN_LOCKED_TITLE = "Too many wrong tries.";
export const PIN_NOT_SET_TITLE = "A parent needs to set a PIN first.";
export const PIN_NOT_SET_HINT = "Settings, then Rewards, then Set PIN.";
export const PIN_NEEDED = "Enter the PIN.";
export const PIN_SHAPE_REFUSAL = "The PIN must be 4 digits.";
export const PIN_SWITCH_REFUSAL = "Pick on or off.";
export const REDEEM_UNDO_REFUSAL = "Only a parent can undo this now.";

/** "A parent enters the PIN to redeem Cupcake for Ellie." */
export function pinRedeemText(title: string, name: string): string {
  return `A parent enters the PIN to redeem ${title} for ${name}.`;
}

/** "Try again in 5 minutes, or set a new PIN in Settings." ("in 1 minute") */
export function pinLockedText(minutes: number): string {
  return `Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}, or set a new PIN in Settings.`;
}

/** Wishes: a reward with no cost yet. */
export const WISH_ADD_LABEL = "Add a wish";
export const WISH_TAG = "Wish";
export const WISH_KID_WAITING = "Waiting for a parent to set the cost";
export const WISH_SET_COST_LABEL = "Set cost";
export const WISH_SHEET_HINT = "A parent will set how many stars it costs.";
export const WISH_SUBMIT_LABEL = "Add wish";
export const WISH_SET_COST_HEADING = "Set a cost";
export const WISH_EDIT_HEADING = "Edit wish";

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
