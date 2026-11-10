import { HOUSEHOLD_TIME_ZONE } from "../constants";
import { calendarDateFromUtcMidnight } from "../householdDate";
import { forLine } from "../calendarSyncVocabulary";
import type { GoogleEventPayload } from "./types";

// Turns a Marshee event into the shape Google Calendar wants. Pure: no
// database, no network, no clock.

export type EventPayloadInput = {
  marsheeEventId: string;
  title: string;
  notes: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  showBusyOnGoogle: boolean;
  /** Display names of the people the event is for. */
  forNames: string[];
};

/**
 * The Google event id for a Marshee event: the lowercase hex of the id's
 * bytes. Google allows a-v and 0-9 (5 to 1024 characters); hex only uses
 * 0-9 and a-f. Known before the call, so a retry cannot make a second copy.
 */
export function googleEventIdFor(marsheeId: string): string {
  const id = Buffer.from(marsheeId, "utf8").toString("hex");
  if (id.length < 5 || id.length > 1024) {
    throw new Error("Marshee event id cannot make a valid Google event id");
  }
  return id;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

function dateString(stored: Date): string {
  const d = calendarDateFromUtcMidnight(stored);
  return `${pad(d.year, 4)}-${pad(d.month, 2)}-${pad(d.day, 2)}`;
}

/**
 * `keepGoogleBusy` leaves `transparency` out, so the PATCH keeps Google's own
 * busy/free choice (a timed event pulled from Google, sent back to its source).
 */
export function toGoogleEvent(input: EventPayloadInput, keepGoogleBusy = false): GoogleEventPayload {
  const notes = input.notes?.trim() ?? "";
  const description = [notes, forLine(input.forNames)].filter((part) => part !== "").join("\n\n");

  const payload: GoogleEventPayload = {
    summary: input.title,
    start: input.allDay
      ? { date: dateString(input.startAt) }
      : { dateTime: input.startAt.toISOString(), timeZone: HOUSEHOLD_TIME_ZONE },
    end: input.allDay
      ? { date: dateString(input.endAt) }
      : { dateTime: input.endAt.toISOString(), timeZone: HOUSEHOLD_TIME_ZONE },
    status: "confirmed",
    extendedProperties: { private: { marsheeEventId: input.marsheeEventId } },
  };
  if (!keepGoogleBusy) {
    payload.transparency = !input.allDay || input.showBusyOnGoogle ? "opaque" : "transparent";
  }
  const location = input.location?.trim();
  if (location) payload.location = location;
  if (description !== "") payload.description = description;
  return payload;
}
