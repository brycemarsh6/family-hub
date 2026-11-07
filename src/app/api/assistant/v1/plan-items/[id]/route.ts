import { assistantRoute } from "@/lib/assistant/assistantRoute";
import type { ChangeInput } from "@/lib/assistant/audit";
import { ApiError, notFound, toWriteFailure } from "@/lib/assistant/errors";
import { viewGoal, winnieMayChangeGoal } from "@/lib/assistant/goalReads";
import { HABIT_TO_OTHER_KIND, editsPlanItemFields, patchedPlanItemRaw, planItemPatchBody } from "@/lib/assistant/schemasGoals";
import { planItemEditChangedAnything, planItemUpdateChanges, toPlanItem } from "@/lib/assistant/serializeGoals";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { db } from "@/lib/db";
import { GOAL_NOT_ALLOWED } from "@/lib/goalWrites";
import { PLAN_ITEM_GONE, planItemRowOf, setStepDone, updatePlanItem } from "@/lib/planItemWrites";
import { missing } from "@/lib/writeError";
import type { z } from "zod";

/** Thrown inside the edit's transaction when nothing would change, so the transaction rolls back and nothing is recorded. */
class NothingChanged extends Error {}

export const PATCH = assistantRoute<{ id: string }, z.output<typeof planItemPatchBody>>({
  action: "planItems.update",
  body: planItemPatchBody,
  handler: async ({ params, body, changes, now }) => {
    const today = requireHouseholdToday(now);
    const { id } = params;

    // Hidden and forbidden are one answer, as the app's own edit gives.
    const found = await db.planItem.findUnique({ where: { id }, include: { goal: { select: { ownerId: true, visibility: true, area: true } } } });
    if (!found) throw toWriteFailure(missing(PLAN_ITEM_GONE));
    if (!winnieMayChangeGoal(found.goal)) throw toWriteFailure(missing(GOAL_NOT_ALLOWED));
    const { goal: _goal, ...row } = found;
    void _goal;
    // Hill's H4: a habit stays a habit here (its checks would be deleted with it).
    if (body.kind !== undefined && body.kind !== "habit" && planItemRowOf(row).kind === "habit") {
      throw new ApiError(400, "validation", HABIT_TO_OTHER_KIND);
    }
    const current = (await viewGoal(row.goalId, today))?.items.find((item) => item.id === id);
    if (!current) throw notFound();

    let diff: ChangeInput[];
    try {
      diff = await db.$transaction(
        async (tx) => {
          let edit: Parameters<typeof planItemUpdateChanges>[0] = {
            item: { before: row, after: row },
            habits: { before: [], after: [] },
            participants: { before: [], after: [] },
          };
          let latest = row;
          if (editsPlanItemFields(body)) {
            const edited = await updatePlanItem(winnieMayChangeGoal, id, patchedPlanItemRaw(current, body), today, null, tx);
            if ("error" in edited) throw toWriteFailure(edited);
            edit = edited;
            latest = edited.item.after;
          }
          if (body.done !== undefined) {
            if (planItemRowOf(latest).kind !== "step" || (latest.doneAt !== null) !== body.done) {
              const ticked = await setStepDone(winnieMayChangeGoal, id, body.done, tx);
              if ("error" in ticked) throw toWriteFailure(ticked);
              edit = { ...edit, item: { before: edit.item.before, after: ticked.after } };
            }
          }
          if (!planItemEditChangedAnything(edit)) throw new NothingChanged();
          return planItemUpdateChanges(edit);
        },
        { timeout: 15000 },
      );
    } catch (error) {
      if (!(error instanceof NothingChanged)) throw error;
      diff = [];
    }
    changes.push(...diff);
    const item = (await viewGoal(row.goalId, today))?.items.find((candidate) => candidate.id === id);
    if (!item) throw notFound();
    return { data: { item: toPlanItem(item) } };
  },
});
