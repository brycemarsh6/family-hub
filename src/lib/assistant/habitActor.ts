import type { HabitActor } from "@/lib/habits/types";

// Who Winnie is to the habit rules (mission 47). The bot is not a user, so
// she borrows one identity: an admin who is "Bryce" for the participant test.
// Fed unchanged to `habits/access.ts` and `habits/tapWrites.ts`, that makes
// her a manager who sees the owner's private habits and nobody else's, and who
// may check for anyone on a habit she can see. Pure: reads one env var.
//
// `ASSISTANT_OWNER_USER_ID` is Bryce's user id (from GET /family), set in
// Vercel. Unset, the id is empty and matches no participant, so she sees
// habits that are not private and nothing else.

export function assistantHabitActor(): HabitActor {
  return { userId: process.env.ASSISTANT_OWNER_USER_ID ?? "", role: "admin" };
}
