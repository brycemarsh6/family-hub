"use server";

// Server Actions for the Calendar branch (Calendar v1, phase K1 — see
// .avengers/plans/calendar-v1.md). Same rule as every other actions file: a
// Server Action is a real public POST endpoint, reachable directly, so
// every one of these opens with a guard.
//
// All three writes here are gated to MANAGER_ROLES ("parents manage, kids
// participate" — the same line the Meal Plan and Recipes actions draw).
// Every one uses the NULL-RETURNING guard form (getVerifiedUser() +
// MANAGER_ROLES read from constants.ts), never requireRole(): these actions
// are reachable from shipped UI (the event form, the detail sheet) that
// renders a failure inline, and a thrown redirect() would bounce a
// signed-in kid's browser mid-request instead of just refusing the write.
// See STRUCTURE.md's guard-form rule.
//
// K1 stores `rrule` and nothing else reads it yet — recurrence expansion is
// K4. These actions accept it as opaque, optional text.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession, getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { isMissingRowError } from "@/lib/prismaErrors";
import { getCalendarEventsInRange } from "@/lib/calendarEventQuery";
import type { CalendarEventView } from "@/lib/types";

function refreshCalendarViews() {
  revalidatePath("/calendar");
}

export type CalendarEventActionResult = { error?: string };

/** The one shape both create and update take — a plain object rather than
 * FormData, since the event form composes real Date objects client-side
 * (native date/time inputs, all-day handling) before calling either action,
 * the same style AddToMealPlanSheet/SlotEditSheet already use for rich
 * interactive forms in this app. */
export type CalendarEventInput = {
  title: string;
  notes?: string | null;
  location?: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  /** rrule is K1-opaque: stored verbatim, never parsed or expanded here. */
  rrule?: string | null;
  /** Every person this event is for. At least one is required — there is
   * no "nobody's" event. */
  userIds: string[];
};

/**
 * Re-validates a proposed people list against the database rather than
 * trusting client-supplied ids, the same discipline
 * addIngredientsToGroceries uses for pantryItemId: a stale or tampered id
 * here would silently attach the wrong person (or a deactivated one) to an
 * event. Returns null (all good) or an error message.
 */
async function validatedPeople(userIds: string[]): Promise<string | null> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return "Add at least one person.";

  const real = await db.user.findMany({
    where: { id: { in: unique }, deactivatedAt: null },
    select: { id: true },
  });
  if (real.length !== unique.length) {
    return "One of those people isn't available anymore.";
  }
  return null;
}

/** Shared field validation for both create and update — title, time range,
 * and people. Returns an error message, or null when the input is good. */
async function validateEventInput(input: CalendarEventInput): Promise<string | null> {
  if (!input.title.trim()) return "Give the event a title.";
  if (input.endAt.getTime() < input.startAt.getTime()) {
    return "End time can't be before the start time.";
  }
  // All-day events store their end EXCLUSIVE (see CalendarEvent.endAt's own
  // schema comment) — an all-day event posted with endAt === startAt covers
  // zero real days and, unenforced, saves successfully and is then
  // invisible in every view forever (mission-8's Vision V2 finding).
  // calendarDates.ts's eventDaySpan independently clamps this so an
  // already-saved bad row can't vanish either — this check is what stops a
  // NEW one from ever being written, which is the cheaper place to catch
  // it.
  if (input.allDay && input.endAt.getTime() <= input.startAt.getTime()) {
    return "An all-day event has to end after it starts.";
  }
  return validatedPeople(input.userIds);
}

export type CreateCalendarEventResult = CalendarEventActionResult & { id?: string };

/**
 * Create an event and its people rows in one nested write, so an event is
 * never briefly saved with nobody on it. `createdById` is always the
 * verified caller — never client-supplied — the same "who actually did
 * this" discipline GroceryItem.addedById established.
 */
export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<CreateCalendarEventResult> {
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  const validationError = await validateEventInput(input);
  if (validationError) return { error: validationError };

  const uniqueUserIds = Array.from(new Set(input.userIds));

  const created = await db.calendarEvent.create({
    data: {
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      location: input.location?.trim() || null,
      startAt: input.startAt,
      endAt: input.endAt,
      allDay: input.allDay,
      rrule: input.rrule?.trim() || null,
      createdById: user.userId,
      people: { create: uniqueUserIds.map((userId) => ({ userId })) },
    },
    select: { id: true },
  });

  refreshCalendarViews();
  return { id: created.id };
}

/**
 * Update an event's fields and replace its people list wholesale. The
 * people rows are deleted and recreated rather than diffed — simpler, and
 * correct for K1's household scale (a handful of people per event, never
 * enough to make a full replace expensive) — inside one transaction so a
 * reader never sees an event with zero people mid-write.
 */
export async function updateCalendarEvent(
  id: string,
  input: CalendarEventInput,
): Promise<CalendarEventActionResult> {
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  const validationError = await validateEventInput(input);
  if (validationError) return { error: validationError };

  const uniqueUserIds = Array.from(new Set(input.userIds));

  try {
    await db.$transaction([
      db.calendarEvent.update({
        where: { id },
        data: {
          title: input.title.trim(),
          notes: input.notes?.trim() || null,
          location: input.location?.trim() || null,
          startAt: input.startAt,
          endAt: input.endAt,
          allDay: input.allDay,
          rrule: input.rrule?.trim() || null,
        },
      }),
      db.calendarEventPerson.deleteMany({ where: { eventId: id } }),
      db.calendarEventPerson.createMany({
        data: uniqueUserIds.map((userId) => ({ eventId: id, userId })),
      }),
    ]);
  } catch (error) {
    // Deleted on another phone while this one still had it open.
    if (isMissingRowError(error)) return { error: "That event no longer exists." };
    throw error;
  }

  refreshCalendarViews();
  return {};
}

/**
 * Single tap, no confirmation dialog — same delete rule as every other item
 * in the app, and there's no recurrence in K1 so there's no This/All choice
 * to ask. People rows cascade with the event (schema-level). Already-gone
 * is treated as success, the same idempotence deleteTag gets from catching
 * P2025 rather than reading first.
 */
export async function deleteCalendarEvent(id: string): Promise<CalendarEventActionResult> {
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  try {
    await db.calendarEvent.delete({ where: { id } });
  } catch (error) {
    if (!isMissingRowError(error)) throw error;
  }

  refreshCalendarViews();
  return {};
}

/**
 * A day span, in milliseconds — used only for the scan cap below, never for
 * constructing a calendar-meaningful Date (that rule is about deciding
 * WHICH day something falls on; this is a plain duration comparison, which
 * milliseconds are fine for).
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * How far apart `windowStart`/`windowEnd` may be. This is a PUBLIC POST
 * endpoint (mission-15/D2) — an unbounded span would let anyone ask for a
 * full table scan of every event the household has ever created. 124 days
 * is comfortably wider than any single UI window this app builds today
 * (Month's six-week grid, Schedule's 30-day chunks) while still bounding the
 * query.
 *
 * Not exported: this file carries `"use server"`, and Next requires every
 * top-level export from a Server Actions module to be an async function —
 * exporting this plain constant made the whole module fail to resolve at
 * build time ("the module has no exports at all"), taking every OTHER
 * export in this file down with it. Caught by `npm run build`, not `tsc`.
 */
const MAX_FETCH_SPAN_DAYS = 124;

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * The first DATA-RETURNING guarded action in this file — every other export
 * above returns `{ error? }` or void. That precedent matters for what a
 * refusal looks like: this returns `[]`, the type's own empty value, rather
 * than throwing. `useScheduleWindow` (mission-15/C3) treats `[]` as "stop
 * fetching in this direction" — a thrown error from a guard refusal would
 * instead be something a naive retry loop could hammer forever.
 *
 * Deliberately EVENTS ONLY, not events-and-tasks, even though Schedule (C3)
 * has to render both. Two reasons, not one: (1) this contract's own
 * boundary only permits touching `actions/calendar.ts` — tasks have their
 * OWN Server Actions file (`actions/tasks.ts`), and adding a task query here
 * would be exactly the kind of file this file shouldn't own. (2) Tasks and
 * events are already two independent queries even on the page that renders
 * both today (`(app)/calendar/page.tsx`'s own `Promise.all`) — there is no
 * existing "one call gets both" precedent to preserve, so an events-only
 * action here doesn't invent a new inconsistency, it continues the existing
 * one. Schedule's hook is expected to call a SIBLING `fetchCalendarTasks`
 * (or similarly-named action) added to `actions/tasks.ts` in a later
 * contract, and merge the two client-side.
 *
 * Uses the null-returning `getVerifiedSession()` form (STRUCTURE.md's guard
 * form (a)), not `getVerifiedUser()`: this only needs "is someone signed
 * in", not a role — reading the calendar is not gated to MANAGER_ROLES the
 * way writing one is ("parents manage, kids participate" is about
 * mutation, not visibility) — and it's reachable from shipped UI (Schedule's
 * scroll), so a thrown `redirect()` would bounce the browser mid-scroll
 * instead of just returning nothing to render.
 */
export async function fetchCalendarEvents(
  windowStart: Date,
  windowEnd: Date,
): Promise<CalendarEventView[]> {
  const session = await getVerifiedSession();
  if (!session) return [];

  // A Server Action is a public POST endpoint — anything can be sent here,
  // so the `Date` type annotations above are a claim to verify, not a
  // guarantee to trust.
  if (!isValidDate(windowStart) || !isValidDate(windowEnd)) return [];
  if (windowEnd.getTime() <= windowStart.getTime()) return [];
  if (windowEnd.getTime() - windowStart.getTime() > MAX_FETCH_SPAN_DAYS * MS_PER_DAY) {
    return [];
  }

  return getCalendarEventsInRange(windowStart, windowEnd);
}
