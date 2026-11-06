import { lifeAreaInfo, type LifeArea } from "./goalVocabulary";
import type { HabitIcon, HabitMode, HabitSchedule, TimeOfDay, Weekday } from "./habitVocabulary";

// Habits & Chores' approved idea library for the New form: six habit ideas per
// life area and eight chore ideas. The wording is approved in
// .avengers/plans/habits-ideas.md and changes there first. A test
// (habitIdeas.test.ts) reads that file and fails if this one drifts from it.
// No React, no db.

/** One tappable idea: the words and every field a tap fills in (decision 173). */
export type HabitIdea = {
  title: string;
  icon: HabitIcon;
  schedule: HabitSchedule;
  /** Only for "weekdays". */
  days: readonly Weekday[];
  /** Only for "weekly" and "monthly"; null otherwise. */
  times: number | null;
  /** Null is Anytime. */
  timeOfDay: TimeOfDay | null;
  mode: HabitMode;
};

const MON = 1;
const TUE = 2;
const WED = 3;
const THU = 4;
const FRI = 5;

type Rest = { timeOfDay: TimeOfDay | null; mode?: HabitMode };

function every(title: string, icon: HabitIcon, timeOfDay: TimeOfDay | null, mode: HabitMode = "build"): HabitIdea {
  return { title, icon, schedule: "daily", days: [], times: null, timeOfDay, mode };
}

function weekly(title: string, icon: HabitIcon, times: number, rest: Rest): HabitIdea {
  return { title, icon, schedule: "weekly", days: [], times, timeOfDay: rest.timeOfDay, mode: rest.mode ?? "build" };
}

function monthly(title: string, icon: HabitIcon, times: number, rest: Rest): HabitIdea {
  return { title, icon, schedule: "monthly", days: [], times, timeOfDay: rest.timeOfDay, mode: rest.mode ?? "build" };
}

function onDays(title: string, icon: HabitIcon, days: readonly Weekday[], timeOfDay: TimeOfDay | null): HabitIdea {
  return { title, icon, schedule: "weekdays", days, times: null, timeOfDay, mode: "build" };
}

/** Six per life area. */
export const HABIT_IDEAS: Record<LifeArea, readonly HabitIdea[]> = {
  spiritual: [
    every("Scripture study", "BookOpen", "morning"),
    every("Family prayer", "HandHeart", "evening"),
    every("Couple prayer", "Heart", "evening"),
    monthly("Go to the temple", "Church", 1, { timeOfDay: null }),
    monthly("Ministering visit or call", "Phone", 1, { timeOfDay: null }),
    onDays("Family home evening", "Smile", [MON], "evening"),
  ],
  health: [
    every("Take a walk", "Footprints", null),
    weekly("Work out", "Dumbbell", 4, { timeOfDay: null }),
    every("Drink enough water", "GlassWater", null),
    every("Take my vitamins", "Pill", "morning"),
    every("In bed by 10", "Bed", "evening"),
    every("No phone in bed", "PhoneOff", "evening", "quit"),
  ],
  growth: [
    every("Read for 20 minutes", "BookOpen", null),
    every("Write in my journal", "PenLine", "evening"),
    weekly("Practice an instrument", "Music", 3, { timeOfDay: null }),
    weekly("Work on a skill for 30 minutes", "GraduationCap", 3, { timeOfDay: null }),
    onDays("Wake up at 6", "AlarmClock", [MON, TUE, WED, THU, FRI], "morning"),
    every("Plan tomorrow before bed", "Brain", "evening"),
  ],
  relationships: [
    weekly("Date night", "Heart", 1, { timeOfDay: "evening" }),
    weekly("One on one time with a kid", "Smile", 1, { timeOfDay: null }),
    weekly("Call a parent or sibling", "Phone", 1, { timeOfDay: null }),
    every("No screens at dinner", "Utensils", "evening", "quit"),
    every("Say something kind to my spouse", "Flower2", null),
    weekly("Write a thank you note", "PenLine", 1, { timeOfDay: null }),
  ],
  financial: [
    weekly("Look over the budget", "PiggyBank", 1, { timeOfDay: null }),
    monthly("Pay the bills", "PiggyBank", 1, { timeOfDay: null }),
    every("No impulse buys", "ShoppingCart", null, "quit"),
    onDays("Pack a lunch", "Salad", [MON, TUE, WED, THU, FRI], "morning"),
    onDays("Plan the work week", "Briefcase", [MON], "morning"),
    weekly("Home for dinner", "Car", 4, { timeOfDay: "evening" }),
  ],
  fun: [
    onDays("Family game night", "Sparkles", [FRI], "evening"),
    weekly("Play outside with the kids", "Sun", 2, { timeOfDay: "afternoon" }),
    monthly("Go on a family hike", "Footprints", 1, { timeOfDay: null }),
    weekly("Ride bikes together", "Bike", 1, { timeOfDay: null }),
    weekly("Try a new recipe", "CookingPot", 1, { timeOfDay: null }),
    weekly("Kitchen dance party", "Music", 1, { timeOfDay: "evening" }),
  ],
};

/** Eight chores, one list whatever the life area (decision 172). */
export const CHORE_IDEAS: readonly HabitIdea[] = [
  every("Make the bed", "Bed", "morning"),
  every("Tidy my room", "Sparkles", "evening"),
  every("Kitchen reset before bed", "CookingPot", "evening"),
  weekly("Take out the trash", "Trash2", 1, { timeOfDay: null }),
  weekly("Do a load of laundry", "WashingMachine", 2, { timeOfDay: null }),
  weekly("Vacuum the floors", "Brush", 1, { timeOfDay: null }),
  weekly("Clean the bathroom", "SprayCan", 1, { timeOfDay: null }),
  every("Feed the pets", "PawPrint", "morning"),
];

/** The form's words for the idea rows and the Life area line under them. */
export const CHORE_IDEAS_LABEL = "Chore ideas";
export const LIFE_AREA_HINT = "Optional";
export const LIFE_AREA_HINT_PICK = "Optional. Pick one to see ideas.";

export function habitIdeasLabel(area: LifeArea): string {
  return `Ideas for ${lifeAreaInfo(area).short}`;
}

/** The idea with this exact title (titles are unique across every list), else null. */
export function findHabitIdea(title: string): HabitIdea | null {
  for (const list of [...Object.values(HABIT_IDEAS), CHORE_IDEAS]) {
    const found = list.find((idea) => idea.title === title);
    if (found) return found;
  }
  return null;
}
