import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { toWriteFailure } from "@/lib/assistant/errors";
import { assistantHabitActor } from "@/lib/assistant/habitActorEnv";
import { requireHouseholdPerson } from "@/lib/assistant/habitReads";
import { habitTapBody, habitTapQuery } from "@/lib/assistant/schemasHabits";
import { logChange } from "@/lib/assistant/serializeHabits";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { canLogFor } from "@/lib/habits/access";
import { tapSkip, tapUncheck } from "@/lib/habitTapWrites";
import { parseDateParam } from "@/lib/householdDate";
import type { z } from "zod";

export const POST = assistantRoute<{ id: string }, z.output<typeof habitTapBody>>({
  action: "habits.skip",
  body: habitTapBody,
  handler: async ({ params, body, changes, now }) => {
    const today = requireHouseholdToday(now);
    await requireHouseholdPerson(body.personId);
    const day = body.day ? parseDateParam(body.day) : undefined;
    const result = await tapSkip((h) => canLogFor(assistantHabitActor(), body.personId, h), { habitId: params.id, forUserId: body.personId, day, loggedById: null }, today);
    if ("error" in result) throw toWriteFailure(result);
    // Already checked or skipped: nothing was written, so nothing is recorded.
    for (const row of result.created) changes.push(logChange("create", row));
    return { data: { skipped: result.created.length } };
  },
});

export const DELETE = assistantRoute<{ id: string }, undefined, z.output<typeof habitTapQuery>>({
  action: "habits.unskip",
  query: habitTapQuery,
  handler: async ({ params, query, changes, now }) => {
    const today = requireHouseholdToday(now);
    await requireHouseholdPerson(query.personId);
    const day = query.day ? parseDateParam(query.day) : undefined;
    const result = await tapUncheck("skip", (h) => canLogFor(assistantHabitActor(), query.personId, h), { habitId: params.id, forUserId: query.personId, day }, today);
    if ("error" in result) throw toWriteFailure(result);
    for (const row of result.removed) changes.push(logChange("delete", row));
    return { data: { removed: result.removed.length } };
  },
});
