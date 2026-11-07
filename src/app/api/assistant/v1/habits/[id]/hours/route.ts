import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound, toWriteFailure } from "@/lib/assistant/errors";
import { assistantHabitActor } from "@/lib/assistant/habitActor";
import { getHabitDetail, requireHouseholdPerson } from "@/lib/assistant/habitReads";
import { habitHoursBody } from "@/lib/assistant/schemasHabits";
import { timeEntryChange } from "@/lib/assistant/serializeHabits";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { logHours } from "@/lib/habits/tapWrites";
import { calendarDateFromUtcMidnight, formatCalendarDate, parseDateParam } from "@/lib/householdDate";
import type { z } from "zod";

export const POST = assistantRoute<{ id: string }, z.output<typeof habitHoursBody>>({
  action: "habits.logHours",
  body: habitHoursBody,
  handler: async ({ params, body, changes, now }) => {
    const today = requireHouseholdToday(now);
    await requireHouseholdPerson(body.personId);
    const day = body.day ? parseDateParam(body.day) : today;
    // The shared rule decides the minutes (whole, 30 to 720, quarter hours) and the day window.
    const result = await logHours(assistantHabitActor(), { habitId: params.id, forUserId: body.personId, day, minutes: body.minutes, loggedById: null }, today);
    if ("error" in result) throw toWriteFailure(result);
    changes.push(timeEntryChange("create", result.entry));
    // Not gated: she just logged it, even on an hours habit the rule keeps private from her.
    const habit = await getHabitDetail(params.id, today, false);
    if (!habit) throw notFound();
    const { entry } = result;
    return {
      status: 201,
      data: {
        entry: { id: entry.id, habitId: entry.habitId, personId: entry.userId, day: formatCalendarDate(calendarDateFromUtcMidnight(entry.day)), minutes: entry.minutes },
        week: habit.hoursWeek?.find((week) => week.personId === body.personId) ?? null,
      },
    };
  },
});
