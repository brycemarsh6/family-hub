import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { didAssistantCreate } from "@/lib/assistant/audit";
import { ApiError, notFound, toWriteFailure } from "@/lib/assistant/errors";
import { assistantHabitActor } from "@/lib/assistant/habitActorEnv";
import { timeEntryChange } from "@/lib/assistant/serializeHabits";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { canLogFor } from "@/lib/habits/access";
import { HABIT_NOT_FOUND, removeHours } from "@/lib/habitTapWrites";
import { missing } from "@/lib/writeError";

export const DELETE = assistantRoute<{ id: string; entryId: string }>({
  action: "habits.removeHours",
  handler: async ({ params, changes, now }) => {
    const today = requireHouseholdToday(now);
    const actor = assistantHabitActor();
    // The guard runs inside the removal's transaction. A habit she may not see
    // (or an entry on another habit) answers 404 before anything about the
    // entry is said; time the family logged answers 403.
    const result = await removeHours(
      async (entry, habit) => {
        if (entry.habitId !== params.id || !canLogFor(actor, entry.userId, habit)) return missing(HABIT_NOT_FOUND);
        if (!(await didAssistantCreate("HabitTimeEntry", entry.id))) {
          throw new ApiError(403, "forbidden", "Winnie can only remove time she logged herself.");
        }
        return null;
      },
      params.entryId,
      today,
    );
    if ("error" in result) throw toWriteFailure(result);
    if (!result.removed) throw notFound();
    changes.push(timeEntryChange("delete", result.removed));
    return { data: { removed: true } };
  },
});
