import {
  checkInBody,
  goalCreateBody,
  goalListQuery,
  goalPatchBody,
  goalWeekQuery,
  planItemCreateBody,
  planItemPatchBody,
  visionBody,
  visionQuery,
} from "./schemasGoals";
import type { Operation } from "./openapiTypes";

// The registry rows for the Plans & Goals routes. Adding a route means adding
// its row here; openapi.test.ts fails until you do.

const NUMBER = "{ unit, start, target, current, progress (0 to 1), pace (reached | onPace | behind | null), checkedInAt | null } | null";

const GOAL =
  `{ id, title, area, why, targetDate | null, ongoing, ownership (mine | together), ownerId | null, private, number: ${NUMBER}, completed, completedAt | null, ` +
  "planItemCount, latestCheckIn: { value, at } | null, canEdit }";

const ITEM =
  "{ id, goalId, title, kind (habit | step | reminder), habitId | null, timesPerPeriod, period (day | week | month) | null, count, target, window (this week | this month) | null, " +
  "done, doneToday, doneAt | null, hours: { doneMinutes, targetMinutes, met, forPersonId } | null }";

const WHO =
  "Winnie sees every goal that is not private, plus the private ones of the household owner; other people's private goals answer 404 like a missing one. " +
  "She changes the owner's goals and Together goals; another person's goal that she can see answers 404 \"You can't change that goal.\". " +
  "\"Mine\" means the household owner: with no owner set, a Mine goal can't be made (400). Goals, plan items and Vision statements are never deleted here.";

export const goalOperations: Operation[] = [
  {
    method: "GET",
    path: "/goals",
    action: "goals.list",
    summary:
      "The goals Winnie may see, soonest target date first (Ongoing goals last). status is active (the default), done or all. personId limits it to that person's goals and Together's (404 for anyone who is not an active household person). " + WHO,
    query: goalListQuery,
    response: `{ goals: [${GOAL}] }.`,
  },
  {
    method: "GET",
    path: "/goals/week",
    action: "goals.week",
    summary:
      "The This week view: every goal she can see (the app's Everyone chip) that has something for the week, or with personId that person's goals plus Together's. " +
      "Each goal lists its rows in the app's order: habits (with this week's count), steps ticked this week, the next step, reminders. " +
      "summary is the week's habit count; habitsLeft the habits still to do; nextSteps each goal's first step not done. On Sundays (Denver) recap is last week's summary, " +
      "the household owner's Mine view for the owner, Everyone's without personId, null for anyone else. Habit rows are checked with POST /habits/{habitId}/check. " + WHO,
    query: goalWeekQuery,
    response:
      "{ weekStart, personId | null, summary: { done, total }, habitsLeft: [{ planItemId, title, left, hoursLine | null }], nextSteps: [{ goalId, planItemId, title }], " +
      `goals: [{ id, title, area, ownership, ownerId | null, planItems: [${ITEM}] }], recapDay, recap: { start, end, done, total, habits: [{ title, count, target, met, hoursText | null }], ` +
      "measures: [{ goalTitle, from, to }], stepsDone: [title] } | null }. 404 for an unknown personId.",
  },
  {
    method: "GET",
    path: "/goals/{id}",
    action: "goals.get",
    summary:
      "One goal with its plan items (each with this week's count and, for a step, doneAt), every check-in newest first (createdByAssistant true for the ones Winnie added and may remove), " +
      "and the vision line its page quotes (10 years: the owner's board, else Together's). " + WHO,
    response:
      `{ goal: { ...${GOAL}, createdByAssistant, planItems: [${ITEM}], checkIns: [{ id, value, at, createdByAssistant }], vision: { board, horizon, text } | null } }. 404 if missing or private to someone else.`,
  },
  {
    method: "GET",
    path: "/vision",
    action: "vision.get",
    summary:
      "The Vision boards: Together first, then each active person in household order, at one horizon (5, 10 or 15 years) or all three. board is \"together\" or a person's id (404 otherwise). " +
      "Every board is readable; canEdit says whether Winnie can write it (Together's and the owner's). goalCount is the active goals on that board for that life area.",
    query: visionQuery,
    response: "{ boards: [{ board (together | personId), canEdit, horizons: [{ horizon, cards: [6 x { area, text | null, goalCount }] }] }] }.",
  },
  {
    method: "POST",
    path: "/goals",
    action: "goals.create",
    summary:
      "Add a goal. title, area (spiritual, health, growth, relationships, financial = Work & Money, fun) and ownership (mine = the household owner's, or together) are required, " +
      "because ownership can never change afterwards. targetDate is YYYY-MM-DD, not in the past; ongoing: true means no end date; send neither and the date is the end of this year. " +
      "why is optional. measureUnit, startValue and targetValue (all three together) give it a number to track. The goal is shared; visibility is not accepted (the owner flips Private in the app). " +
      "The app's own sentences refuse the rest (400). " + WHO + " Undoable.",
    body: goalCreateBody,
    response: `201 { goal: as GET /goals/{id} }. 400 for anything the goal form would refuse.`,
  },
  {
    method: "PATCH",
    path: "/goals/{id}",
    action: "goals.update",
    summary:
      "Change any of the create fields except ownership (what is left out stays as it is); the target date can't move earlier. completed: true marks the goal done, completed: false opens it again. " +
      "Adding a number sets it at its start value; changing its unit, start or target keeps the current reading; removeNumber: true takes it away, but only when the goal has no check-ins (400 otherwise: ask the owner). " +
      "A change that changes nothing answers 200 and records nothing. " + WHO + " Undoable (the number's current reading is rebuilt from the check-ins left).",
    body: goalPatchBody,
    response: `{ goal: as GET /goals/{id} }. 400 for anything the goal form would refuse. 404 if missing, private to someone else, or not hers to change.`,
  },
  {
    method: "POST",
    path: "/goals/{id}/check-ins",
    action: "goals.checkIn",
    summary:
      "Record where the goal's number stands now (value). Only a goal with a number can be checked in (400). Several check-ins a day are fine; the newest sets the goal's current reading. " + WHO + " Undoable.",
    body: checkInBody,
    response: "201 { checkIn: { id, value, at }, goal: as GET /goals/{id} }.",
  },
  {
    method: "DELETE",
    path: "/goals/{id}/check-ins/{checkInId}",
    action: "goals.removeCheckIn",
    summary:
      "Remove a check-in that Winnie added herself (ones the family made are theirs: 403). Entry ids are in GET /goals/{id}. The goal's current reading goes back to the newest check-in left, or its start value. Undoable.",
    response: "{ removed: true, goal: as GET /goals/{id} }. 403 forbidden for a check-in she didn't add. 404 if the check-in or goal is missing or not hers to change.",
  },
  {
    method: "POST",
    path: "/goals/{id}/plan-items",
    action: "goals.addPlanItem",
    summary:
      "Add a plan item under a goal, last in its list. kind is habit, step or reminder. A habit needs period (day, week or month) and timesPerPeriod (a day takes 1, a week 1 to 7, a month 1 to 31), " +
      "or track: hours with weeklyHours (whole hours) and paceDays (monsat or every) for a weekly hours target. Only a habit repeats. A habit makes its Habit (the goal owner's, or everyone's on a Together goal; private under a private goal): " +
      "check it with POST /habits/{habitId}/check. " + WHO + " Undoable (undo removes the habit too).",
    body: planItemCreateBody,
    response: `201 { item: ${ITEM} }. 400 for anything the plan form would refuse.`,
  },
  {
    method: "PATCH",
    path: "/plan-items/{id}",
    action: "planItems.update",
    summary:
      "Change a plan item's title, kind or repeat (what is left out stays as it is), and/or done: true / false to tick or untick a step (only a step can be checked off, else 400). " +
      "A step and a reminder can swap, and become a habit; a habit can't become a step or a reminder here (400: ask the owner). An hours habit keeps its hours unless track is named. " +
      "A change that changes nothing answers 200 and records nothing. " + WHO + " Undoable.",
    body: planItemPatchBody,
    response: `{ item: ${ITEM} }. 400 for anything the plan form would refuse. 404 if the item is missing or its goal is not hers to change.`,
  },
  {
    method: "PUT",
    path: "/vision/{board}/{area}/{horizon}",
    action: "vision.save",
    summary:
      "Write one Vision statement. board is \"together\" or a person's id; she can write Together's and the household owner's only (403 otherwise; 400 when no owner is set). " +
      "area is a life area key, horizon is 5, 10 or 15. text is up to 500 characters and can't be empty: she writes a vision, she doesn't clear one (400). " +
      "The same words again change nothing and record nothing. Undoable.",
    body: visionBody,
    response: "201 (new) or 200 (replaced) { vision: { board, area, horizon, text } }.",
  },
];
