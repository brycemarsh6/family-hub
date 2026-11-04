import type { LifeArea } from "./goalVocabulary";

// Plans & Goals' approved wording: the vision prompts, goal ideas and plan
// ideas per life area. The wording is Bryce's, approved in
// .avengers/plans/plans-goals-prompts.md, and changes there first. A test
// (goalPrompts.test.ts) reads that file and fails if this one drifts from it.
// No React, no db.

/** Ten per area, written for a 5, 10 or 15 year horizon. One shows at a time. */
export const VISION_PROMPTS: Record<LifeArea, readonly string[]> = {
  spiritual: [
    "When the kids are grown, what will they say faith looked like in our home?",
    "What do you want to be true about your prayers in ten years that is not true today?",
    "How often do you want to be in the temple, and who do you want beside you?",
    "What does a Sabbath feel like in our home in ten years?",
    "Who do you want to have served long enough that it changed you?",
    "What will you be able to teach the kids about God from your own experience, not from a lesson?",
    "Which scripture do you want to have lived, not just read?",
    "What do you want to feel when you sit down in the chapel at 45?",
    "What question about God do you want to have found peace with?",
    "What milestone do you want the whole family gathered for in fifteen years?",
  ],
  health: [
    "What do you want your body to be able to do at 45 that it cannot do today?",
    "What does a Tuesday look like when you feel your best, from waking up to lights out?",
    "What hike, race or trip do you want to be fit enough for with the kids?",
    "What do you want to still be doing at 70 that most people have quit?",
    "How do you want to feel when you wake up most mornings?",
    "What does dinner at our table look like in five years?",
    "What will your doctor be glad to hear at your checkup in ten years?",
    "What do you reach for on a hard day, and what do you want to reach for instead?",
    "What does real rest look like for you, and how often do you want it?",
    "What habit will you be glad you started this year?",
  ],
  growth: [
    "What do you want to be known for by the people who know you best?",
    "What skill do you want to be truly good at by then, not just dabbling in?",
    "What do you want to have made, finished or built with your own hands?",
    "What do you want to be able to teach the kids that you cannot teach today?",
    "What would you try this year if nobody would see you fail?",
    "What does an evening look like when you have used it well?",
    "What book or idea do you want to have changed how you think?",
    "Who do you want to have become, apart from your job?",
    "What do you want to still be curious about at 50?",
    "What would the person you admire most notice about you in ten years?",
  ],
  financial: [
    "What does a normal month feel like when money is not a worry?",
    "What will we own, and what will we owe, in ten years?",
    "What will money let us say yes to that we say no to today?",
    "What do you want the kids to know about money before they leave home?",
    "How much do you want to be giving each year, and to whom?",
    "What does your work look like in five years, and who do you work with?",
    "If $10,000 showed up tomorrow, where would it go without a discussion?",
    "What money decision do you want to never have to make again?",
    "When does retirement start, and what does the first year of it look like?",
    "What will our family do together that only money made possible?",
  ],
  relationships: [
    "What do you want your marriage to feel like once the kids have moved out?",
    "What will the kids remember most about growing up in our home?",
    "Which friendships do you want to still be close in fifteen years?",
    "What tradition do you want the family to count on every year?",
    "How do you want your kids to describe you to their friends?",
    "What does a date night look like when the kids are teenagers?",
    "Who do you want to be the first call when something goes wrong?",
    "What do you want extended family to feel when they walk in our door?",
    "What hard conversation do you want to be good at having by then?",
    "What does our table look like at Thanksgiving in fifteen years?",
  ],
};

/** Three per area: chips on New goal that fill in the name. */
export const GOAL_IDEAS: Record<LifeArea, readonly string[]> = {
  spiritual: [
    "Read the Book of Mormon this year",
    "Temple every month",
    "Pray together every day",
  ],
  health: [
    "Weigh 165 lb",
    "Exercise 4 times a week",
    "Sleep 7 hours a night",
  ],
  growth: [
    "Read 12 books this year",
    "Finish a watercolor course",
    "Learn to cook five new dishes",
  ],
  financial: [
    "Earn $500K this year",
    "Buy an investment property",
    "Pay off the car",
  ],
  relationships: [
    "A strong marriage",
    "One-on-one time with each kid",
    "Stay close to family far away",
  ],
};

/** Four per area: chips on Add to the plan that fill in the title. */
export const PLAN_IDEAS: Record<LifeArea, readonly string[]> = {
  spiritual: [
    "Couple prayers at bedtime",
    "Ten minutes of scripture before phone",
    "Temple on the first Saturday",
    "Family prayer before dinner",
  ],
  health: [
    "Walk after dinner",
    "Drink 8 glasses of water",
    "Meal prep on Sunday",
    "No phone after 10",
  ],
  growth: [
    "Read 20 pages a day",
    "One lesson a week",
    "Practice for 15 minutes",
    "Journal on Sunday night",
  ],
  financial: [
    "Budget together on Sunday",
    "Review spending every Friday",
    "List one thing on Marketplace",
    "Move money to savings on payday",
  ],
  relationships: [
    "Date night every week",
    "Kids date once a month",
    "Call family on Sunday",
    "Ten minutes of real talk after the kids are down",
  ],
};

/** The prompt at `index`, wrapping with a true modulo so any whole number lands on one. */
export function promptAt(area: LifeArea, index: number): string {
  const list = VISION_PROMPTS[area];
  return list[((index % list.length) + list.length) % list.length];
}

/** The index after `index`, wrapping to 0 at the end of the list. */
export function nextPromptIndex(index: number, length: number): number {
  return (((index + 1) % length) + length) % length;
}
