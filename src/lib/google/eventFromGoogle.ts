import { calendarDateFromUtcMidnight, utcMidnightInstant } from "../householdDate";
import { withoutForLine } from "../calendarSyncVocabulary";
import type { GoogleEventIn } from "./types";

// Reads a Google event back into Marshee's fields: the inverse of
// eventPayload.ts. Pure: no database, no network, no clock.

export type PulledEvent =
  | { kind: "cancelled"; id: string }
  | { kind: "skip"; id: string }
  | {
      kind: "event";
      id: string;
      etag: string | null;
      updated: Date;
      marsheeEventId?: string;
      title: string;
      notes: string | null;
      location: string | null;
      startAt: Date;
      endAt: Date;
      allDay: boolean;
      /** All-day: Google's busy choice (busy when absent). Timed: false, the column's meaning. */
      showBusyOnGoogle: boolean;
    };

const SKIPPED_TYPES = ["workingLocation", "focusTime"];

function allDayInstant(text: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? "");
  if (!m) return null;
  const date = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  const instant = utcMidnightInstant(date);
  // Rejects dates that roll over, like 2026-02-31.
  const back = calendarDateFromUtcMidnight(instant);
  return back.year === date.year && back.month === date.month && back.day === date.day ? instant : null;
}

function timedInstant(text: string | undefined): Date | null {
  if (!text) return null;
  const instant = new Date(text);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

export function eventFromGoogle(event: GoogleEventIn): PulledEvent {
  const id = event.id;
  if (event.status === "cancelled") return { kind: "cancelled", id };
  if (event.eventType && SKIPPED_TYPES.includes(event.eventType)) return { kind: "skip", id };

  const allDay = event.start?.date !== undefined && event.start.dateTime === undefined;
  let startAt: Date | null;
  let endAt: Date | null;
  if (allDay) {
    startAt = allDayInstant(event.start?.date);
    endAt = allDayInstant(event.end?.date);
    // End is exclusive; a missing one means a single day.
    if (startAt && !endAt) endAt = new Date(startAt.getTime() + 86_400_000);
  } else {
    startAt = timedInstant(event.start?.dateTime);
    endAt = timedInstant(event.end?.dateTime) ?? startAt;
  }
  if (!startAt || !endAt) return { kind: "skip", id };

  const title = event.summary?.trim() ?? "";
  const notes = withoutForLine(event.description ?? "");
  const location = event.location?.trim() ?? "";
  const marsheeEventId = event.extendedProperties?.private?.marsheeEventId;
  const updated = timedInstant(event.updated) ?? new Date(0);
  return {
    kind: "event",
    id,
    etag: typeof event.etag === "string" ? event.etag : null,
    updated,
    ...(typeof marsheeEventId === "string" && marsheeEventId !== "" ? { marsheeEventId } : {}),
    title: title === "" ? "(No title)" : title,
    notes: notes === "" ? null : notes,
    location: location === "" ? null : location,
    startAt,
    endAt,
    allDay,
    showBusyOnGoogle: allDay && event.transparency !== "transparent",
  };
}
