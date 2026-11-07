import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound, toWriteFailure } from "@/lib/assistant/errors";
import { getHabit, habitSnapshot, listHabits } from "@/lib/assistant/habitReads";
import { habitCreateBody, habitListQuery, newHabitInput } from "@/lib/assistant/schemasHabits";
import { habitChanges } from "@/lib/assistant/serializeHabits";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { assistantHabitActor } from "@/lib/assistant/habitActorEnv";
import { db } from "@/lib/db";
import { canEditHabit } from "@/lib/habits/access";
import { INCLUDE_YOURSELF, checkHabitInput } from "@/lib/habitInput";
import { createHabit } from "@/lib/habits/habitWrites";
import { householdParticipantIds } from "@/lib/habits/participantWrites";
import { invalid } from "@/lib/writeError";
import type { z } from "zod";

export const GET = assistantRoute<Record<string, never>, undefined, z.output<typeof habitListQuery>>({
  action: "habits.list",
  query: habitListQuery,
  handler: async ({ query, now }) => {
    const habits = await listHabits({ personId: query.personId, includeArchived: query.includeArchived === "true" }, requireHouseholdToday(now));
    if (!habits) throw notFound();
    return { data: { habits } };
  },
});

export const POST = assistantRoute<Record<string, never>, z.output<typeof habitCreateBody>>({
  action: "habits.create",
  body: habitCreateBody,
  handler: async ({ body, changes, now }) => {
    const today = requireHouseholdToday(now);
    const household = await householdParticipantIds();
    // The app's own rules and words decide what is acceptable.
    const actor = assistantHabitActor();
    const checked = checkHabitInput(newHabitInput(body, household, actor.userId), household);
    if ("error" in checked) throw toWriteFailure(invalid(checked.error));
    // The app's rule: you may not make what you could not edit afterwards.
    if (!canEditHabit(actor, { isPrivate: checked.fields.isPrivate ?? false, participantIds: checked.participantIds })) {
      throw toWriteFailure(invalid(INCLUDE_YOURSELF));
    }

    // Made by the bot, not a user: createdById stays null.
    const after = await db.$transaction(
      async (tx) => {
        const habit = await createHabit(
          { fields: checked.fields, participantIds: checked.participantIds, everyone: checked.everyone, today },
          tx,
        );
        return habitSnapshot(tx, habit.id);
      },
      { timeout: 15000 },
    );
    if (!after) throw notFound();
    changes.push(...habitChanges(null, after));
    // Not gated: she just made it. (A one-person hours habit is private only for the owner, whom she can see, so it stays visible to her.)
    return { status: 201, data: { habit: await getHabit(after.habit.id, today, false) } };
  },
});
