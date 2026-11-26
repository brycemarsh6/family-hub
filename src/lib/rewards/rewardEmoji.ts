// The quick-pick pictures for a reward (mission 81) and the one check on any
// emoji typed with the device keyboard. Pure: no `server-only`, no database.

/** One quick pick: the emoji itself (the column stores it) and its caption. */
export type RewardEmojiItem = { emoji: string; name: string };
export type RewardEmojiGroup = { label: string; items: readonly RewardEmojiItem[] };

/** The 60 quick picks, five groups of 12, in the order the picker shows them. "No picture" and "Any emoji" are separate tiles. */
export const REWARD_EMOJI_GROUPS: readonly RewardEmojiGroup[] = [
  {
    label: "Treats",
    items: [
      { emoji: "🧁", name: "Cupcake" },
      { emoji: "🍭", name: "Lollipop" },
      { emoji: "🍦", name: "Ice cream" },
      { emoji: "🍩", name: "Doughnut" },
      { emoji: "🍪", name: "Cookie" },
      { emoji: "🍫", name: "Chocolate" },
      { emoji: "🍬", name: "Candy" },
      { emoji: "🍿", name: "Popcorn" },
      { emoji: "🍕", name: "Pizza" },
      { emoji: "🍔", name: "Burger" },
      { emoji: "🌮", name: "Taco" },
      { emoji: "🥤", name: "Drink" },
    ],
  },
  {
    label: "Outings",
    items: [
      { emoji: "🦁", name: "Zoo" },
      { emoji: "🐠", name: "Aquarium" },
      { emoji: "🦖", name: "Dinosaur museum" },
      { emoji: "🎡", name: "Ferris wheel" },
      { emoji: "🎢", name: "Roller coaster" },
      { emoji: "🏊", name: "Swimming" },
      { emoji: "🏖️", name: "Beach" },
      { emoji: "⛺", name: "Camping" },
      { emoji: "🎬", name: "Movie" },
      { emoji: "🎳", name: "Bowling" },
      { emoji: "⛸️", name: "Ice skating" },
      { emoji: "🛝", name: "Playground" },
    ],
  },
  {
    label: "Toys and play",
    items: [
      { emoji: "🧸", name: "Teddy bear" },
      { emoji: "🎮", name: "Video game" },
      { emoji: "🧩", name: "Puzzle" },
      { emoji: "🎨", name: "Art" },
      { emoji: "📚", name: "Books" },
      { emoji: "🪁", name: "Kite" },
      { emoji: "⚽", name: "Soccer" },
      { emoji: "🏀", name: "Basketball" },
      { emoji: "🚲", name: "Bike" },
      { emoji: "🛹", name: "Skateboard" },
      { emoji: "🎲", name: "Board game" },
      { emoji: "🧱", name: "Building bricks" },
    ],
  },
  {
    label: "At home",
    items: [
      { emoji: "📺", name: "TV" },
      { emoji: "📱", name: "Tablet time" },
      { emoji: "🎧", name: "Headphones" },
      { emoji: "🎵", name: "Music" },
      { emoji: "🌙", name: "Stay up late" },
      { emoji: "🛏️", name: "Sleepover" },
      { emoji: "🛁", name: "Bubble bath" },
      { emoji: "💅", name: "Nails" },
      { emoji: "🍽️", name: "Pick dinner" },
      { emoji: "🥞", name: "Pancakes" },
      { emoji: "🎤", name: "Karaoke" },
      { emoji: "🐶", name: "Pet" },
    ],
  },
  {
    label: "Big and special",
    items: [
      { emoji: "🎁", name: "Gift" },
      { emoji: "💵", name: "Money" },
      { emoji: "🪙", name: "Coin" },
      { emoji: "🛍️", name: "Shopping" },
      { emoji: "🎟️", name: "Tickets" },
      { emoji: "🏆", name: "Trophy" },
      { emoji: "👑", name: "Crown" },
      { emoji: "🎈", name: "Balloon" },
      { emoji: "🎉", name: "Party" },
      { emoji: "🌈", name: "Rainbow" },
      { emoji: "🚀", name: "Rocket" },
      { emoji: "❤️", name: "Heart" },
    ],
  },
];

const MAX_UNITS = 32;
const SEGMENTER = new Intl.Segmenter("en", { granularity: "grapheme" });
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const FLAG = /^\p{Regional_Indicator}{2}$/u;
const KEYCAP = /^[0-9#*]️?⃣$/u;

/**
 * One emoji, or null. Accepts a string of at most 32 UTF-16 units that is
 * exactly one grapheme (after trimming) and that grapheme is a picture, a
 * flag (two regional indicators) or a keycap. A skin tone and a ZWJ family
 * are each one grapheme, so they pass. Anything else, a number included, is null.
 */
export function toRewardEmoji(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (text.length === 0 || text.length > MAX_UNITS) return null;
  const graphemes = [...SEGMENTER.segment(text)];
  if (graphemes.length !== 1) return null;
  const grapheme = graphemes[0].segment;
  return PICTOGRAPHIC.test(grapheme) || FLAG.test(grapheme) || KEYCAP.test(grapheme) ? grapheme : null;
}

/** The last thing typed, as one character as a person sees it (a flag or a family is one). */
export function lastGrapheme(text: string): string {
  const parts = Array.from(SEGMENTER.segment(text), (part) => part.segment);
  return parts[parts.length - 1] ?? "";
}

/** True when the emoji is one of the quick picks. */
export function isQuickPick(emoji: string): boolean {
  return REWARD_EMOJI_GROUPS.some((group) => group.items.some((item) => item.emoji === emoji));
}
