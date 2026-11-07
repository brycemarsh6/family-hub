import { assistantRoute } from "@/lib/assistant/assistantRoute";
import type { ChangeInput } from "@/lib/assistant/audit";
import { ApiError, notFound, toWriteFailure } from "@/lib/assistant/errors";
import { getGoal, lockGoal, winnieMayChangeGoal } from "@/lib/assistant/goalReads";
import { NUMBER_HAS_CHECK_INS, editsGoalFields, goalPatchBody, patchedGoalRaw } from "@/lib/assistant/schemasGoals";
import { changedColumns, checkInChange, goalUpdateChange } from "@/lib/assistant/serializeGoals";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { db } from "@/lib/db";
import type { GoalCheckIn } from "@/generated/prisma/client";
import { GOAL_GONE, GOAL_NOT_ALLOWED, setGoalCompleted, updateGoal } from "@/lib/goalWrites";
import { missing } from "@/lib/writeError";
import type { z } from "zod";

/** Thrown inside the edit's transaction when nothing would change, so the transaction rolls back and nothing is recorded. */
class NothingChanged extends Error {}

export const GET = assistantRoute<{ id: string }>({
  action: "goals.get",
  handler: async ({ params, now }) => {
    const goal = await getGoal(params.id, requireHouseholdToday(now));
    if (!goal) throw notFound();
    return { data: { goal } };
  },
});

export const PATCH = assistantRoute<{ id: string }, z.output<typeof goalPatchBody>>({
  action: "goals.update",
  body: goalPatchBody,
  handler: async ({ params, body, changes, now }) => {
    const today = requireHouseholdToday(now);
    const { id } = params;

    // The goal is locked, read, written and read again in ONE transaction, so the
    // copies are exactly what this request changed. If it changed nothing the
    // transaction is rolled back (no write, no record).
    let diff: ChangeInput[];
    try {
      diff = await db.$transaction(
        async (tx) => {
          await lockGoal(tx, id);
          const before = await tx.goal.findUnique({ where: { id } });
          if (!before) throw toWriteFailure(missing(GOAL_GONE));
          if (!winnieMayChangeGoal(before)) throw toWriteFailure(missing(GOAL_NOT_ALLOWED));

          let removed: GoalCheckIn[] = [];
          if (editsGoalFields(body)) {
            const raw = patchedGoalRaw(before, body);
            // Hill's H2: a number with check-ins stays, whoever made them.
            if (raw.measure === null && before.measureUnit !== null && (await tx.goalCheckIn.count({ where: { goalId: id } })) > 0) {
              throw new ApiError(400, "validation", NUMBER_HAS_CHECK_INS);
            }
            const edited = await updateGoal(winnieMayChangeGoal, id, raw, today, tx);
            if ("error" in edited) throw toWriteFailure(edited);
            removed = edited.removed;
          }
          if (body.completed !== undefined && (before.completedAt !== null) !== body.completed) {
            const done = await setGoalCompleted(winnieMayChangeGoal, id, body.completed, tx);
            if ("error" in done) throw toWriteFailure(done);
          }

          const after = await tx.goal.findUniqueOrThrow({ where: { id } });
          if (changedColumns(before, after, "Goal").length === 0 && removed.length === 0) throw new NothingChanged();
          return [...goalUpdateChange(before, after), ...removed.map((checkIn) => checkInChange("delete", checkIn))];
        },
        { timeout: 15000 },
      );
    } catch (error) {
      if (!(error instanceof NothingChanged)) throw error;
      diff = [];
    }
    changes.push(...diff);
    const goal = await getGoal(id, today);
    if (!goal) throw notFound();
    return { data: { goal } };
  },
});
