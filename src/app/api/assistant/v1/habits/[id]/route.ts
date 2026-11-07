import { assistantRoute } from "@/lib/assistant/assistantRoute";
import type { ChangeInput } from "@/lib/assistant/audit";
import { notFound, toWriteFailure } from "@/lib/assistant/errors";
import { assistantHabitActor } from "@/lib/assistant/habitActor";
import { getHabit, getHabitDetail, habitSnapshot } from "@/lib/assistant/habitReads";
import { habitInputFromRow, habitPatchBody, patchedHabitInput } from "@/lib/assistant/schemasHabits";
import { habitChanges } from "@/lib/assistant/serializeHabits";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { db } from "@/lib/db";
import { canEditHabit } from "@/lib/habits/access";
import { checkHabitInput } from "@/lib/habits/habitInput";
import { archiveHabit, restoreHabit, updateHabit } from "@/lib/habits/habitWrites";
import { householdParticipantIds } from "@/lib/habits/participantWrites";
import { loadHabitForAction } from "@/lib/habitsRead";
import { invalid } from "@/lib/writeError";
import type { z } from "zod";

/** Thrown inside the edit's transaction when nothing would change, so the transaction rolls back and nothing is recorded. */
class NothingChanged extends Error {}

export const GET = assistantRoute<{ id: string }>({
  action: "habits.get",
  handler: async ({ params, now }) => {
    const habit = await getHabitDetail(params.id, requireHouseholdToday(now));
    if (!habit) throw notFound();
    return { data: { habit } };
  },
});

export const PATCH = assistantRoute<{ id: string }, z.output<typeof habitPatchBody>>({
  action: "habits.update",
  body: habitPatchBody,
  handler: async ({ params, body, changes, now }) => {
    const today = requireHouseholdToday(now);
    const actor = assistantHabitActor();
    const found = await loadHabitForAction(params.id);
    if (!found || !canEditHabit(actor, found)) throw notFound();
    const household = await householdParticipantIds();
    const { archived, ...edit } = body;

    // The habit is locked, read, written and read again in ONE transaction, so
    // the copies are exactly what this request changed. If it changed nothing
    // the transaction is rolled back (no write, no record).
    let diff: ChangeInput[];
    try {
      diff = await db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Habit" WHERE "id" = ${params.id} FOR UPDATE`;
          const before = await habitSnapshot(tx, params.id);
          if (!before) throw notFound();
          const ids = before.participants.map((p) => p.userId);
          if (!canEditHabit(actor, { isPrivate: before.habit.isPrivate, participantIds: ids })) throw notFound();
          if (Object.keys(edit).length > 0) {
            const current = habitInputFromRow(await tx.habit.findUniqueOrThrow({ where: { id: params.id } }), ids);
            const checked = checkHabitInput(patchedHabitInput(current, edit), household, ids);
            if ("error" in checked) throw toWriteFailure(invalid(checked.error));
            await updateHabit(params.id, checked.fields, today, tx, { participantIds: checked.participantIds, everyone: checked.everyone });
          }
          if (archived !== undefined && (before.habit.archivedAt !== null) !== archived) {
            if (archived) await archiveHabit(params.id, now, today, tx);
            else await restoreHabit(params.id, today, tx);
          }
          const changed = habitChanges(before, await habitSnapshot(tx, params.id));
          if (changed.length === 0) throw new NothingChanged();
          return changed;
        },
        { timeout: 15000 },
      );
    } catch (error) {
      if (!(error instanceof NothingChanged)) throw error;
      diff = [];
    }
    changes.push(...diff);
    // Not gated: she just edited it.
    const habit = await getHabit(params.id, today, false);
    if (!habit) throw notFound();
    return { data: { habit } };
  },
});
