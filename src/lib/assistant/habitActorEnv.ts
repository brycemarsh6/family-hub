import "server-only";
import type { HabitActor } from "@/lib/habits/types";
import type { Viewer } from "@/lib/goals";
import { goalViewerFor, habitActorFor } from "./habitActor";

// The one place `ASSISTANT_OWNER_USER_ID` (Bryce's id, set in Vercel) is read.
// Like `authPolicy.ts`, the rule is pure and the environment is read here.

export function assistantHabitActor(): HabitActor {
  return habitActorFor(process.env.ASSISTANT_OWNER_USER_ID);
}

/** Winnie as a Plans & Goals viewer (a person, never a device). */
export function assistantGoalViewer(): Viewer {
  return goalViewerFor(process.env.ASSISTANT_OWNER_USER_ID);
}

/** Bryce's id, or null when `ASSISTANT_OWNER_USER_ID` is unset or empty ("Mine" then has nobody to belong to). */
export function assistantOwnerId(): string | null {
  const id = process.env.ASSISTANT_OWNER_USER_ID;
  return id ? id : null;
}
