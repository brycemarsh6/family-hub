import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { didAssistantCreate } from "@/lib/assistant/audit";
import { ApiError, notFound, toWriteFailure } from "@/lib/assistant/errors";
import { getGoal, winnieMayChangeGoal } from "@/lib/assistant/goalReads";
import { CHECK_IN_NOT_HERS } from "@/lib/assistant/schemasGoals";
import { checkInChange, goalUpdateChange } from "@/lib/assistant/serializeGoals";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { GOAL_GONE, GOAL_NOT_ALLOWED, removeCheckIn } from "@/lib/goalWrites";
import { missing } from "@/lib/writeError";

export const DELETE = assistantRoute<{ id: string; checkInId: string }>({
  action: "goals.removeCheckIn",
  handler: async ({ params, changes, now }) => {
    const today = requireHouseholdToday(now);
    // The guard runs inside the removal's transaction. A check-in on another
    // goal, or on a goal she may not change, answers 404 before anything about
    // it is said; one the family made answers 403.
    const result = await removeCheckIn(async (checkIn, goal) => {
      if (checkIn.goalId !== params.id) return missing(GOAL_GONE);
      if (!winnieMayChangeGoal(goal)) return missing(GOAL_NOT_ALLOWED);
      if (!(await didAssistantCreate("GoalCheckIn", checkIn.id))) throw new ApiError(403, "forbidden", CHECK_IN_NOT_HERS);
      return null;
    }, params.checkInId);
    if ("error" in result) throw toWriteFailure(result);
    if (!result.removed || !result.before || !result.after) throw notFound();
    changes.push(...goalUpdateChange(result.before, result.after), checkInChange("delete", result.removed));
    const goal = await getGoal(params.id, today);
    if (!goal) throw notFound();
    return { data: { removed: true, goal } };
  },
});
