import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { didAssistantCreate } from "@/lib/assistant/audit";
import { ApiError, notFound, toWriteFailure } from "@/lib/assistant/errors";
import { assistantHabitActor } from "@/lib/assistant/habitActor";
import { readTimeEntry } from "@/lib/assistant/habitReads";
import { timeEntryChange } from "@/lib/assistant/serializeHabits";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { canLogFor } from "@/lib/habits/access";
import { removeHours } from "@/lib/habits/tapWrites";
import { loadHabitForAction } from "@/lib/habitsRead";

export const DELETE = assistantRoute<{ id: string; entryId: string }>({
  action: "habits.removeHours",
  handler: async ({ params, changes, now }) => {
    const today = requireHouseholdToday(now);
    const actor = assistantHabitActor();
    const entry = await readTimeEntry(params.entryId);
    if (!entry || entry.habitId !== params.id) throw notFound();
    // A habit she may not see answers 404 before anything about the entry is said.
    const habit = await loadHabitForAction(entry.habitId);
    if (!habit || !canLogFor(actor, entry.userId, habit)) throw notFound();
    if (!(await didAssistantCreate("HabitTimeEntry", entry.id))) {
      throw new ApiError(403, "forbidden", "Winnie can only remove time she logged herself.");
    }
    const result = await removeHours(actor, entry.id, today);
    if ("error" in result) throw toWriteFailure(result);
    if (!result.removed) throw notFound();
    changes.push(timeEntryChange("delete", result.removed));
    return { data: { removed: true } };
  },
});
