import "server-only";
import type { HabitActor } from "@/lib/habits/types";
import { habitActorFor } from "./habitActor";

// The one place `ASSISTANT_OWNER_USER_ID` (Bryce's id, set in Vercel) is read.
// Like `authPolicy.ts`, the rule is pure and the environment is read here.

export function assistantHabitActor(): HabitActor {
  return habitActorFor(process.env.ASSISTANT_OWNER_USER_ID);
}
