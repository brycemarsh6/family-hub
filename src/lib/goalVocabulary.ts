import { Church, HeartHandshake, HeartPulse, PiggyBank, Sprout } from "lucide-react";

// Plans & Goals' one vocabulary: life areas, plan item kinds, habit periods,
// who can see a goal and whose it is. Lives beside navMode.ts rather than in
// constants.ts (which is at its line cap). No React components or db access:
// the lucide icon references are plain values, the same as nav.ts, so this
// file is importable from a Server Action and a client component alike.
// No Prisma enums: the database stores these as plain strings and the
// `to*` narrowers below repair anything unexpected.

/** The five life areas, in the order the Goals list groups them. */
export const LIFE_AREAS = [
  { key: "spiritual", label: "Spiritual", short: "Spiritual", icon: Church },
  { key: "health", label: "Health & Wellness", short: "Health", icon: HeartPulse },
  { key: "growth", label: "Personal Growth", short: "Growth", icon: Sprout },
  { key: "financial", label: "Financial", short: "Financial", icon: PiggyBank },
  {
    key: "relationships",
    label: "Relationships & Connections",
    short: "Relationships",
    icon: HeartHandshake,
  },
] as const;

export type LifeArea = (typeof LIFE_AREAS)[number]["key"];

/** Narrows a stored or submitted value to a LifeArea; null for anything unknown. */
export function toLifeArea(raw: unknown): LifeArea | null {
  return LIFE_AREAS.find((area) => area.key === raw)?.key ?? null;
}

export function lifeAreaInfo(key: LifeArea) {
  return LIFE_AREAS.find((area) => area.key === key) ?? LIFE_AREAS[0];
}

export const PLAN_KINDS = ["habit", "step", "reminder"] as const;

export type PlanKind = (typeof PLAN_KINDS)[number];

export const PLAN_KIND_LABELS: Record<PlanKind, { label: string; hint: string }> = {
  habit: { label: "Habit", hint: "repeats" },
  step: { label: "Step", hint: "do it once" },
  reminder: { label: "Reminder", hint: "just keep in mind" },
};

export function toPlanKind(raw: unknown): PlanKind | null {
  return PLAN_KINDS.find((kind) => kind === raw) ?? null;
}

export const HABIT_PERIODS = ["day", "week", "month"] as const;

export type HabitPeriod = (typeof HABIT_PERIODS)[number];

export function toHabitPeriod(raw: unknown): HabitPeriod | null {
  return HABIT_PERIODS.find((period) => period === raw) ?? null;
}

export const GOAL_VISIBILITIES = ["shared", "private"] as const;

export type GoalVisibility = (typeof GOAL_VISIBILITIES)[number];

/** Anything unknown is "private": a goal fails closed, hidden from everyone but its owner. */
export function toGoalVisibility(raw: unknown): GoalVisibility {
  return GOAL_VISIBILITIES.find((option) => option === raw) ?? "private";
}

export const GOAL_OWNERSHIPS = ["mine", "together"] as const;

export type GoalOwnership = (typeof GOAL_OWNERSHIPS)[number];

export const GOAL_OWNERSHIP_LABELS: Record<GoalOwnership, string> = {
  mine: "Mine",
  together: "Together",
};
