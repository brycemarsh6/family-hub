import {
  habitChartQuery,
  habitCreateBody,
  habitHoursBody,
  habitListQuery,
  habitPatchBody,
  habitPersonQuery,
  habitTapBody,
  habitTapQuery,
} from "./schemasHabits";
import type { Operation } from "./openapiTypes";

// The registry rows for the habit and chore routes. Adding a route means
// adding its row here; openapi.test.ts fails until you do.

const HABIT =
  "{ id, title, kind, mode, icon, lifeArea, timeOfDay, schedule, weekdays, times, anchorWeek, carryOver, sharing, isPrivate, everyone, archived, " +
  "track, weeklyMinutes, paceDays, participants: [{ personId, streak, bestStreak }] }";

const WHO =
  "Winnie sees and changes the habits that are not private, plus the private ones of the household owner; other people's private habits answer 404 like a missing one. " +
  "personId must be an active household person (GET /family), else 404; a person who is not on the habit is also 404.";

const DAYS =
  "day is YYYY-MM-DD: today (the default), up to 7 days back, or the one missed day a carried-over habit stands for; never the future (400). ";

export const habitOperations: Operation[] = [
  {
    method: "GET",
    path: "/habits",
    action: "habits.list",
    summary:
      "Habits and chores Winnie may see, A to Z, each with its people and their streaks (a chore shows the person's chore streak). " +
      "Live ones first; archived ones follow when includeArchived=true. personId limits it to one person's. " + WHO,
    query: habitListQuery,
    response: `{ habits: [${HABIT}] }. 404 for an unknown personId.`,
  },
  {
    method: "GET",
    path: "/habits/today",
    action: "habits.today",
    summary:
      "One person's day (personId), or every active person's in household order (the family's tablet login and deactivated people are left out). " +
      "Each row is a habit due or open that day; state is done (checked, or an hours goal met), skipped or left; carriedFrom is the missed day a tap would be written late for. " +
      WHO,
    query: habitPersonQuery,
    response:
      "{ date, people: [{ personId, rows: [{ habitId, title, kind, dueState (required | open | none), state (done | late | skipped | left), carriedFrom | null, onVacation, skippedThisWeek, " +
      "hours: { doneMinutes, targetMinutes, leftMinutes, met } | null }], choreStreak }] }. 404 for an unknown personId.",
  },
  {
    method: "GET",
    path: "/habits/chart",
    action: "habits.chart",
    summary:
      "One person's chore chart for this week: the default week (which chore falls on which weekday) and this week's days with what moved or was skipped. " +
      "Changing the chart is not part of this API. " + WHO,
    query: habitChartQuery,
    response:
      "{ personId, today, defaultWeek: [7 x { weekday (0 = Sunday), name, chores: [{ id, title }] }], thisWeek: { start, end, days: [7 x { weekday, name, date, isToday, " +
      "chores: [{ id, title, state (required | skipped | moved-away), tag | null }] }] } }. 404 for an unknown personId.",
  },
  {
    method: "GET",
    path: "/habits/{id}",
    action: "habits.get",
    summary:
      "One habit with its stats: each person's current and best streak, an hours habit's week per person (done, left, a day's pace, and this week's entries with their ids, " +
      "loggedByAssistant true for the ones Winnie logged and may remove), the last 14 days of checks, and createdByAssistant.",
    response:
      `{ habit: { ...${HABIT}, hoursWeek: [{ personId, weekStart, doneMinutes, targetMinutes, leftMinutes, perDayMinutes | null, met, byDay: [7 minutes, Sunday first], ` +
      "entries: [{ id, day, minutes, loggedByAssistant }] }] | null, recentLogs: [{ personId, day, status (done | late | skipped) }], createdByAssistant } }. 404 if missing or private to someone else.",
  },
  {
    method: "POST",
    path: "/habits",
    action: "habits.create",
    summary:
      "Add a habit or chore. Send title and who it is for: participantIds, or everyone: true (the whole household, and later joiners). " +
      "Defaults: kind habit, mode build, schedule daily (a chore: weekdays, which needs weekdays), sharing each, track checks, no carry-over, times 1 for weekly and monthly, " +
      "hours counted monsat. weekdays is seven 0/1 characters, Sunday first; biweekly needs a Sunday anchorWeek; track hours needs weeklyHours (1 to 80), is for one person each, habits only. " +
      "The app's own rules and sentences refuse the rest (400). isPrivate is not accepted: an hours habit for one person is private by rule, so it is visible to Winnie only when it is the owner's. Undoable.",
    body: habitCreateBody,
    response: `201 { habit: ${HABIT} }. 400 for anything the habit form would refuse.`,
  },
  {
    method: "PATCH",
    path: "/habits/{id}",
    action: "habits.update",
    summary:
      "Change any of the create fields (what is left out stays as it is) and the people (participantIds replaces them). archived: true archives it and archived: false brings it back, " +
      "history kept; there is no delete. A change that changes nothing answers 200 and records nothing. isPrivate cannot be changed. Undoable.",
    body: habitPatchBody,
    response: `{ habit: ${HABIT} }. 400 for anything the habit form would refuse. 404 if missing or private to someone else.`,
  },
  {
    method: "POST",
    path: "/habits/{id}/check",
    action: "habits.check",
    summary:
      "Check a habit or chore off for a person. " + DAYS + "A check on a carried-over missed day is written late. " +
      "A Together habit checks everyone on it. Already checked or skipped that day changes nothing and records nothing. Habits that track hours are logged with /hours instead (400). " + WHO + " Undoable.",
    body: habitTapBody,
    response: "{ checked: <rows written, 0 when nothing changed>, status: done | late | null }.",
  },
  {
    method: "DELETE",
    path: "/habits/{id}/check",
    action: "habits.uncheck",
    summary:
      "Take back a check (personId and optionally day as query parameters). A skip on that day stays. Nothing to take back changes nothing and records nothing. Same day window as checking. Undoable.",
    query: habitTapQuery,
    response: "{ removed: <rows removed> }.",
  },
  {
    method: "POST",
    path: "/habits/{id}/skip",
    action: "habits.skip",
    summary:
      "Skip a day for a person (same day window, people and rules as checking). A Together habit skips everyone on it. Already checked or skipped changes nothing and records nothing. Undoable.",
    body: habitTapBody,
    response: "{ skipped: <rows written, 0 when nothing changed> }.",
  },
  {
    method: "DELETE",
    path: "/habits/{id}/skip",
    action: "habits.unskip",
    summary: "Take back a skip (personId and optionally day as query parameters). A check on that day stays. Undoable.",
    query: habitTapQuery,
    response: "{ removed: <rows removed> }.",
  },
  {
    method: "POST",
    path: "/habits/{id}/hours",
    action: "habits.logHours",
    summary:
      "Log time on an hours habit for a person. minutes is a whole number from 30 to 720 in steps of 15, else 400. " + DAYS +
      "Several entries may share a day. Not for a habit that tracks checks (400). " + WHO + " Undoable.",
    body: habitHoursBody,
    response: "201 { entry: { id, habitId, personId, day, minutes }, week: the person's week as in GET /habits/{id} (hoursWeek item) }.",
  },
  {
    method: "DELETE",
    path: "/habits/{id}/hours/{entryId}",
    action: "habits.removeHours",
    summary:
      "Remove a time entry that Winnie logged herself (entries the family logged are theirs: 403). Entry ids are in GET /habits/{id}. Undoable.",
    response: "{ removed: true }. 403 forbidden for time she didn't log. 404 if the entry or habit is missing or private to someone else.",
  },
];
