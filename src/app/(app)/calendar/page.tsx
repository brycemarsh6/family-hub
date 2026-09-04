import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { resolveServerFetchWindow } from "@/lib/calendarPaging";
import { CalendarViews } from "@/components/CalendarViews";
import type { CalendarEventView } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The Calendar branch's landing page. No read action exists for calendar
 * events by design (see mission-8's C1 report): pages in this app read
 * through `db` directly in the Server Component, same as the dashboard, so
 * this page owns its own range query.
 *
 * mission-9/C6 ("We HAVE to fix it. Let's do it the way Google does it."):
 * the fetch window now follows the period being VIEWED (the "?date="
 * search param — CalendarViews.tsx pushes a real navigation here every
 * time the user pages, switches view, or taps Today), not a fixed ±60 days
 * around the server's own clock. `resolveServerFetchWindow`
 * (calendarPaging.ts) is where the two rules this contract is built around
 * both live: the param is validated SEMANTICALLY, not lexically (rejects
 * "2026-02-30" rather than letting `Date` roll it to Mar 2), and the
 * window it builds is a padded RANGE, never a decided calendar day — see
 * that function's own comment for exactly why that distinction is what
 * makes it safe to build server-side at all. No parameter (a fresh visit
 * to `/calendar`) falls back to the server's own clock for this BOUNDING
 * purpose only, same as K1 always did — WHICH day is "today" for
 * rendering is still decided entirely in the browser, by
 * CalendarViews.tsx's useToday()/useCalendarPeriod, completely unchanged
 * by this contract.
 */
export default async function CalendarPage({
  searchParams,
}: {
  // mission-9/C8: `string`, not the reality — Next hands `string[]` for a
  // REPEATED key ("?date=X&date=X"), which the old `{ date?: string }`
  // annotation lied about. See the normalization below.
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  // Only to decide whether CalendarViews should ever show create/edit/
  // delete controls (C4) — the real gate is each write action's own
  // MANAGER_ROLES check in actions/calendar.ts. Reuses the DAL's cached
  // loadSessionUser(), so this doesn't add a second lookup beyond what the
  // (app) layout above already does for the header.
  const user = await getVerifiedUser();
  const canManage = user !== null && MANAGER_ROLES.includes(user.role);

  const { date: rawDate } = await searchParams;
  // A repeated "?date=" key made this coerce to "X,X" (failing
  // parseDateParam's regex and silently centering on today) while
  // CalendarViews.tsx's `searchParams.get("date")` took only the first "X"
  // — the two sides disagreeing produced 42 not-loaded glyphs and 0 pills.
  // Taking the first value here is exactly what `.get()` already does
  // client-side, so both sides agree again.
  const date = Array.isArray(rawDate) ? rawDate[0] : rawDate;
  const { windowStart, windowEnd } = resolveServerFetchWindow(date, new Date());

  // One query, events joined with their people in the same round trip
  // (Prisma's nested `select`, not a second query) — there's nothing else
  // on this page to batch into a Promise.all alongside it.
  const events = await db.calendarEvent.findMany({
    where: {
      // Overlap test: an event is in range if it starts before the window
      // ends AND ends after the window starts — this is what also catches
      // a multi-day event that started before windowStart but still runs
      // into it.
      startAt: { lt: windowEnd },
      endAt: { gt: windowStart },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      notes: true,
      location: true,
      startAt: true,
      endAt: true,
      allDay: true,
      people: {
        select: {
          user: { select: { id: true, displayName: true, avatarColor: true } },
        },
      },
      // Narrow select, never `{ ...row }` — the same "no passwordHash can
      // ever ride along" discipline personInfo.ts documents, applied here
      // for the detail sheet's "Added by" line (C4). This nested select is
      // the exact instance STRUCTURE.md's one-source-of-truth note on
      // personInfo.ts names as NOT a second definition.
      createdBy: { select: { displayName: true } },
    },
  });

  const eventViews: CalendarEventView[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    notes: event.notes,
    location: event.location,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: event.allDay,
    people: event.people.map((person) => ({
      userId: person.user.id,
      displayName: person.user.displayName,
      avatarColor: person.user.avatarColor,
    })),
    // See CalendarEventView's own comment (src/lib/types.ts): this used to
    // be a separate `Record<eventId, name>` map threaded alongside `events`
    // until mission-9's Captain finding (K2/C2a) folded it into the event
    // itself.
    createdByName: event.createdBy?.displayName ?? null,
  }));

  return (
    <div className="py-2">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Calendar</h1>
      <div className="mt-4">
        <CalendarViews
          events={eventViews}
          canManage={canManage}
          windowStart={windowStart}
          windowEnd={windowEnd}
        />
      </div>
    </div>
  );
}
