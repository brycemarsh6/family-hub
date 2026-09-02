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
import { getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { isMissingRowError } from "@/lib/prismaErrors";

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
