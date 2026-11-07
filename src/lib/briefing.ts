// The pure builder for Winnie's morning briefing (mission 48, C1).
//
// No database, no env var, no clock read: it takes plain data and `today`,
// and returns text. `briefingRead.ts` gathers the data; the cron route sends
// the result. Date and badge rules are reused, not rewritten: the Calendar's
// badge words (`spanBadgeLabel`), the summary's day-covering rule
// (`bucketEventsByDay`, `eventDayRange`) and the Today card's vacation words.

import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { spanBadgeLabel } from "@/lib/calendarDates";
import {
  calendarDateFromUtcMidnight,
  calendarDaysBetween,
  dayOfWeek,
  formatHouseholdClock,
  formatShortCalendarDate,
  hourInZone,
  type CalendarDate,
} from "@/lib/householdDate";
import { VACATION_TODAY_LABEL, vacationThroughLabel } from "@/lib/habitVocabulary";
import { FULL_DAY_NAMES, MONTH_NAMES } from "@/lib/mealPlanDates";
import { bucketEventsByDay, eventDayRange } from "@/lib/assistant/summary";

export const BRIEFING_EVENT_TYPE = "briefing.daily";

/** True from 9:00:00 to 9:59:59 on the household's wall clock (Winnie drops anything earlier). */
export function isBriefingHour(now: Date): boolean {
  return hourInZone(now, HOUSEHOLD_TIME_ZONE) === 9;
}

/** "Friday, Nov 13". */
export function briefingDateLabel(today: CalendarDate): string {
  return `${FULL_DAY_NAMES[dayOfWeek(today)]}, ${MONTH_NAMES[today.month - 1]} ${today.day}`;
}

export function briefingTitle(today: CalendarDate): string {
  return `Marshee briefing: ${briefingDateLabel(today)}`;
}

/** "Emily" / "Emily and Ledger" / "Emily, Ledger and Lucy". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Tasks due today, then overdue ones (most recently due first); future ones are dropped. */
export function briefingTasks(tasks: { title: string; dueDate: Date }[], today: CalendarDate): string[] {
  const dated = tasks
    .map((task, index) => ({
      title: task.title,
      index,
      late: calendarDaysBetween(calendarDateFromUtcMidnight(task.dueDate), today),
    }))
    .filter((task) => task.late >= 0);
  const dueToday = dated.filter((task) => task.late === 0);
  const overdue = dated.filter((task) => task.late > 0).sort((a, b) => a.late - b.late || a.index - b.index);
  return [
    ...dueToday.map((task) => task.title),
    ...overdue.map((task) => `${task.title} (${task.late} ${task.late === 1 ? "day" : "days"} overdue)`),
  ];
}

type BriefingEvent = { title: string; startAt: Date; endAt: Date; allDay: boolean; others: string[] };

/** Today's events: badge items (all-day, multi-day) first by start, then timed ones by start. */
export function briefingEvents(events: BriefingEvent[], today: CalendarDate): string[] {
  const todays = bucketEventsByDay(events, [today]).values().next().value ?? [];
  const badged: { event: BriefingEvent; badge: string }[] = [];
  const timed: BriefingEvent[] = [];
  for (const event of todays) {
    const [first, last] = eventDayRange(event, HOUSEHOLD_TIME_ZONE);
    const badge = spanBadgeLabel(
      calendarDaysBetween(first, today) + 1,
      calendarDaysBetween(first, last) + 1,
      event.allDay,
    );
    if (badge) badged.push({ event, badge });
    else timed.push(event);
  }
  const byStart = (a: Date, b: Date) => a.getTime() - b.getTime();
  const withOthers = (text: string, others: string[]) =>
    others.length > 0 ? `${text} (with ${joinNames(others)})` : text;
  return [
    ...[...badged]
      .sort((a, b) => byStart(a.event.startAt, b.event.startAt))
      .map(({ event, badge }) => withOthers(`${badge} ${event.title}`, event.others)),
    ...[...timed]
      .sort((a, b) => byStart(a.startAt, b.startAt))
      .map((event) => withOthers(`${formatHouseholdClock(event.startAt, HOUSEHOLD_TIME_ZONE, { dropZeroMinutes: true })} ${event.title}`, event.others)),
  ];
}

export type BriefingInput = {
  name: string;
  today: CalendarDate;
  vacationThrough: CalendarDate | null;
  chores: string[];
  tasks: string[];
  events: string[];
  meals: { slot: string; title: string | null }[];
  picks: { title: string; period: "this week" | "this month" }[];
};

const ITEM_SEPARATOR = " · ";

/** The message body: a greeting, then only the sections that have something in them. */
export function buildBriefingMessage(input: BriefingInput): string {
  const greeting = `Good morning, ${input.name}. Here's ${briefingDateLabel(input.today)}.`;
  const lines: string[] = [];
  if (input.vacationThrough) {
    // On the vacation's last day the card says "today", as on the Today page.
    lines.push(
      calendarDaysBetween(input.today, input.vacationThrough) <= 0
        ? `Chores: ${VACATION_TODAY_LABEL}`
        : `Chores: ${vacationThroughLabel(formatShortCalendarDate(input.vacationThrough))}`,
    );
  } else if (input.chores.length > 0) {
    lines.push(`Chores: ${input.chores.join(ITEM_SEPARATOR)}`);
  }
  if (input.tasks.length > 0) lines.push(`Tasks: ${input.tasks.join(ITEM_SEPARATOR)}`);
  if (input.events.length > 0) lines.push(`Calendar: ${input.events.join(ITEM_SEPARATOR)}`);
  const meals = input.meals.flatMap((meal) => (meal.title ? [`${meal.slot}: ${meal.title}`] : []));
  if (meals.length > 0) lines.push(`Meals: ${meals.join(ITEM_SEPARATOR)}`);
  if (input.picks.length > 0) {
    const picks = input.picks.map((pick) => `${pick.title} (${pick.period})`).join(ITEM_SEPARATOR);
    lines.push(`Pick a day: ${picks}. Tap the Pick a day card in Marshee.`);
  }
  if (lines.length === 0) return `${greeting} Nothing on today.`;
  return [greeting, ...lines].join("\n");
}
