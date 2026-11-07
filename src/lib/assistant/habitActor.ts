import type { HabitActor } from "@/lib/habits/types";

// Who Winnie is to the habit rules (mission 47). The bot is not a user, so
// she borrows one identity: an admin who is "Bryce" for the participant test.
// Fed to `habits/access.ts` (through the guards the routes pass to
// `habitTapWrites.ts`), that makes her a manager who sees the owner's private
// habits and nobody else's, and who may check for anyone on a habit she can
// see. Pure: the owner's id is passed in; `habitActorEnv.ts` reads it.
//
// The owner is Bryce's user id (from GET /family). Unset, the id is empty and
// matches no participant, so she sees habits that are not private and
// nothing else.

export function habitActorFor(ownerId: string | undefined): HabitActor {
  return { userId: ownerId ?? "", role: "admin" };
}
