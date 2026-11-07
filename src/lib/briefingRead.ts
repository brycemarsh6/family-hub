import "server-only";

import { db } from "@/lib/db";
import { getCalendarEventsInRange } from "@/lib/calendarEventQuery";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import {
  addCalendarDays,
  calendarDaysBetween,
  parseDateParam,
  startOfWeek,
  utcMidnightInstant,
  zoneMidnightInstant,
  type CalendarDate,
} from "@/lib/householdDate";
import type { HouseholdAdult, HouseholdPerson } from "@/lib/householdPeople";
import { planWindow } from "@/lib/mealPlanWeek";
import { findPlanForWeek } from "@/lib/assistant/summary";
import { slotsForDay } from "@/lib/dashboard";
import { loadTodayPage } from "@/lib/habitsRead";
import { choresTileRows } from "@/lib/habitsDashboard";
import { briefingEvents, briefingTasks, type BriefingInput } from "@/lib/briefing";
import type { CalendarEventView } from "@/lib/types";

// Gathers one adult's day for the morning briefing (mission 48, C2). The
// reads that are the same for everyone (calendar, tasks, the meal plan) run
// once per cron run in `loadBriefingShared`; `loadBriefingInput` then picks
// one person's share and adds their own habits. No auth: only the
// CRON_SECRET-protected route calls this.

type SharedTask = { title: string; dueDate: Date; personIds: string[] };
type SharedMeals = { slot: string; title: string | null }[];

/** What every adult's briefing reads in common, fetched once per run. */
export type BriefingShared = {
  events: CalendarEventView[];
  tasks: SharedTask[];
  meals: SharedMeals;
};

/** The calendar, open tasks and meal plan for `today`, read once for the whole run. */
export async function loadBriefingShared(today: CalendarDate): Promise<BriefingShared> {
  const sunday = startOfWeek(today);
  const sundayInstant = zoneMidnightInstant(sunday, HOUSEHOLD_TIME_ZONE).getTime();
  const [events, taskRows, plans] = await Promise.all([
    getCalendarEventsInRange(
      zoneMidnightInstant(today, HOUSEHOLD_TIME_ZONE),
      zoneMidnightInstant(addCalendarDays(today, 1), HOUSEHOLD_TIME_ZONE),
    ),
    db.task.findMany({
      where: { completedAt: null, dueDate: { lt: utcMidnightInstant(addCalendarDays(today, 1)) } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      select: { title: true, dueDate: true, people: { select: { userId: true } } },
    }),
    db.mealPlan.findMany({
      where: { weekStart: planWindow(sundayInstant) },
      select: {
        weekStart: true,
        entries: { select: { dayOffset: true, slot: true, title: true, recipeId: true } },
      },
    }),
  ]);
  const plan = findPlanForWeek(plans, sunday, HOUSEHOLD_TIME_ZONE);
  const meals = slotsForDay(plan?.entries ?? [], calendarDaysBetween(sunday, today)).map(({ slot, title }) => ({ slot, title }));
  return {
    events,
    tasks: taskRows.map((row) => ({ title: row.title, dueDate: row.dueDate, personIds: row.people.map((p) => p.userId) })),
    meals,
  };
}

/**
 * One adult's briefing input. Privacy of private habits: chores and picks come
 * only from `loadTodayPage` with this person as the viewer, which reads just
 * the habits they take part in and applies `canSeeHabit`, so a private habit
 * can only reach its own participant's briefing.
 */
export async function loadBriefingInput(
  person: HouseholdAdult,
  today: CalendarDate,
  household: HouseholdPerson[],
  shared: BriefingShared,
): Promise<BriefingInput> {
  const page = await loadTodayPage({ userId: person.id, role: person.role }, today);

  const chores = choresTileRows(page.rows).rows.filter((row) => !row.doneToday).map((row) => row.title);

  // H3: monthly habits read "this month", everything else "this week".
  const scheduleById = new Map(page.manage.map((item) => [item.id, item.schedule]));
  const picks = page.prompts.map((prompt) => ({
    title: prompt.title,
    period: scheduleById.get(prompt.habitId) === "monthly" ? ("this month" as const) : ("this week" as const),
  }));

  // H1 and H7: the other active people on the event, in household order.
  const events = shared.events
    .filter((event) => event.people.some((p) => p.userId === person.id))
    .map((event) => {
      const onIt = new Set(event.people.map((p) => p.userId));
      const others = household.filter((p) => p.id !== person.id && onIt.has(p.id)).map((p) => p.displayName);
      return { title: event.title, startAt: event.startAt, endAt: event.endAt, allDay: event.allDay, others };
    });

  const tasks = shared.tasks.filter((task) => task.personIds.includes(person.id));

  return {
    name: person.displayName,
    today,
    vacationThrough: page.vacationThrough ? parseDateParam(page.vacationThrough) : null,
    chores,
    tasks: briefingTasks(tasks, today),
    events: briefingEvents(events, today),
    meals: shared.meals,
    picks,
  };
}
