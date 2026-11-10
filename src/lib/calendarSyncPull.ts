import type { GoogleEventIn } from "@/lib/google/types";
import { eventFromGoogle } from "@/lib/google/eventFromGoogle";

// Decides what one pulled page of Google events does to Marshee (mission 58,
// "Fury's design decisions, revised"). Pure: no database, no network, no
// clock (the caller passes `now`). The binding that reads `known` from the
// database and writes the plan back is calendarEventPull.ts (C4).

/** The six fields a person sees and a conflict can lose. */
export type EventFields = {
  title: string;
  notes: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
};

/**
 * What Marshee already holds for one Google event on this calendar. Built by
 * the binding with two queries: (1) this calendar's CalendarEventSync rows
 * whose googleEventId is in the page, with their event, fills `byGoogleId`
 * (`hasRow: true`); (2) events whose id is in the page's marsheeEventId
 * values and that have no row on this calendar, fills `byMarsheeId`
 * (`hasRow: false`, the sync fields null).
 */
export type KnownEvent = {
  eventId: string;
  hasRow: boolean;
  /** The row's etag; null when there is no row or none was saved. */
  etag: string | null;
  lastPushedAt: Date | null;
  lastPulledAt: Date | null;
  /** CalendarEvent.updatedAt. */
  eventUpdatedAt: Date;
  sourceLinkedCalendarId: string | null;
  /** The event as Marshee has it now, for `previousJson` when Google wins. */
  current: EventFields;
};

export type PullKnown = {
  byGoogleId: ReadonlyMap<string, KnownEvent>;
  byMarsheeId: ReadonlyMap<string, KnownEvent>;
};

export type PullInput = {
  calendar: { id: string };
  /** The account's linker: the creator and the one person on a new event. */
  linkerId: string;
  /** The oldest an unknown event may end and still come in. */
  windowStart: Date;
  googleEvents: GoogleEventIn[];
  known: PullKnown;
  /** The time of this pull: `lastPulledAt`, and the `updatedAt` of events it writes. */
  now: Date;
};

export type PullInsert = {
  googleEventId: string;
  event: EventFields & {
    createdById: string;
    personIds: string[];
    sourceLinkedCalendarId: string;
    showBusyOnGoogle: boolean;
    updatedAt: Date;
  };
  sync: {
    linkedCalendarId: string;
    googleEventId: string;
    etag: string | null;
    status: "ok";
    lastPulledAt: Date;
  };
};

export type PullRowPatch = {
  etag: string | null;
  lastPulledAt: Date;
  /** Set when Google's change is taken or the row is new; absent when Marshee keeps a newer edit. */
  status?: "ok";
  /** The losing side's six fields as JSON; absent when nobody lost. */
  previousJson?: string;
};

export type PullUpdate = {
  eventId: string;
  googleEventId: string;
  /** Google's fields to write on the event; null keeps Marshee's version. */
  fields: (EventFields & { showBusyOnGoogle: boolean; updatedAt: Date }) | null;
  /** True when `fields` differs from what Marshee holds (the view needs a refresh). */
  changed: boolean;
  /** True when no row exists yet (a Google copy found by marsheeEventId). */
  createRow: boolean;
  row: PullRowPatch;
};

export type PullDelete = { eventId: string; googleEventId: string };

export const PULL_SKIP_REASONS = [
  "echo",
  "marshee-only",
  "cancelled-unknown",
  "before-window",
  "not-an-event",
  "marshee-deleted",
] as const;
export type PullSkipReason = (typeof PULL_SKIP_REASONS)[number];

export type PullPlan = {
  inserts: PullInsert[];
  updates: PullUpdate[];
  deletes: PullDelete[];
  /** Event ids Marshee won a conflict for: the binding pushes them with pushEventCopies. */
  pushBacks: string[];
  skipped: { googleEventId: string; reason: PullSkipReason }[];
};

function sameFields(a: EventFields, b: EventFields): boolean {
  return (
    a.title === b.title &&
    a.notes === b.notes &&
    a.location === b.location &&
    a.startAt.getTime() === b.startAt.getTime() &&
    a.endAt.getTime() === b.endAt.getTime() &&
    a.allDay === b.allDay
  );
}

function fieldsJson(f: EventFields): string {
  return JSON.stringify({
    title: f.title,
    notes: f.notes,
    location: f.location,
    startAt: f.startAt,
    endAt: f.endAt,
    allDay: f.allDay,
  });
}

/** Google changed it when its etag differs from the row's (a missing etag counts as changed). */
function googleChanged(known: KnownEvent, etag: string | null): boolean {
  return known.etag === null || etag === null || known.etag !== etag;
}

/** Marshee changed it when the event was saved after both the last push and the last pull. */
function marsheeChanged(known: KnownEvent): boolean {
  const seen = Math.max(known.lastPushedAt?.getTime() ?? -Infinity, known.lastPulledAt?.getTime() ?? -Infinity);
  return known.eventUpdatedAt.getTime() > seen;
}

/** Only the last copy of an id counts when a run repeats one. */
function lastPerId(events: GoogleEventIn[]): GoogleEventIn[] {
  const byId = new Map<string, GoogleEventIn>();
  for (const e of events) byId.set(e.id, e);
  return [...byId.values()];
}

export function planPull(input: PullInput): PullPlan {
  const { calendar, linkerId, windowStart, known, now } = input;
  const plan: PullPlan = { inserts: [], updates: [], deletes: [], pushBacks: [], skipped: [] };
  const skip = (googleEventId: string, reason: PullSkipReason) => plan.skipped.push({ googleEventId, reason });

  for (const raw of lastPerId(input.googleEvents)) {
    const ev = eventFromGoogle(raw);
    const hit = known.byGoogleId.get(ev.id);

    if (ev.kind === "cancelled") {
      if (hit) plan.deletes.push({ eventId: hit.eventId, googleEventId: ev.id });
      else skip(ev.id, "cancelled-unknown");
      continue;
    }
    if (ev.kind === "skip") {
      skip(ev.id, "not-an-event");
      continue;
    }

    const theirs: EventFields = {
      title: ev.title,
      notes: ev.notes,
      location: ev.location,
      startAt: ev.startAt,
      endAt: ev.endAt,
      allDay: ev.allDay,
    };

    const match = hit ?? (ev.marsheeEventId ? known.byMarsheeId.get(ev.marsheeEventId) : undefined);
    if (!match) {
      // A Marshee-made copy whose event is gone must not come back to life.
      if (ev.marsheeEventId) skip(ev.id, "marshee-deleted");
      else if (ev.endAt.getTime() < windowStart.getTime()) skip(ev.id, "before-window");
      else {
        plan.inserts.push({
          googleEventId: ev.id,
          event: {
            ...theirs,
            createdById: linkerId,
            personIds: [linkerId],
            sourceLinkedCalendarId: calendar.id,
            showBusyOnGoogle: ev.showBusyOnGoogle,
            updatedAt: now,
          },
          sync: { linkedCalendarId: calendar.id, googleEventId: ev.id, etag: ev.etag, status: "ok", lastPulledAt: now },
        });
      }
      continue;
    }

    // A Google copy of a Marshee event that has no row yet: adopt it, change nothing.
    if (!match.hasRow) {
      plan.updates.push({
        eventId: match.eventId,
        googleEventId: ev.id,
        fields: null,
        changed: false,
        createRow: true,
        row: { etag: ev.etag, lastPulledAt: now, status: "ok" },
      });
      continue;
    }

    if (!googleChanged(match, ev.etag)) {
      skip(ev.id, marsheeChanged(match) ? "marshee-only" : "echo");
      continue;
    }

    const base = { eventId: match.eventId, googleEventId: ev.id, createRow: false };
    if (!marsheeChanged(match) || ev.updated.getTime() > match.eventUpdatedAt.getTime()) {
      // Google's change is taken; if Marshee also changed, its version is kept in previousJson.
      plan.updates.push({
        ...base,
        fields: { ...theirs, showBusyOnGoogle: ev.showBusyOnGoogle, updatedAt: now },
        changed: !sameFields(theirs, match.current),
        row: {
          etag: ev.etag,
          lastPulledAt: now,
          status: "ok",
          ...(marsheeChanged(match) ? { previousJson: fieldsJson(match.current) } : {}),
        },
      });
    } else {
      // Marshee's edit is later: keep it, remember Google's, and push Marshee's.
      plan.updates.push({
        ...base,
        fields: null,
        changed: false,
        row: { etag: ev.etag, lastPulledAt: now, previousJson: fieldsJson(theirs) },
      });
      plan.pushBacks.push(match.eventId);
    }
  }
  return plan;
}
