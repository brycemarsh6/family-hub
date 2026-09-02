import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { addDays } from "@/lib/mealPlanDates";
import { CalendarViews, type CalendarEventView } from "@/components/CalendarViews";

export const dynamic = "force-dynamic";

// How far each side of the server's own clock to fetch events for. This
// bounds the QUERY only — it is never used to decide "today" (that decision
// happens entirely client-side, in CalendarViews, via useToday()). Wide
// enough to give Previous/Next real room to page through without hitting
// the edge of what was fetched; K1 has no follow-up fetch for paging past
// this window, so that's this phase's one real limit, not a bug.
const WINDOW_DAYS = 60;

/**
 * The Calendar branch's landing page — also its only page in K1 (Week and
 * Day views; no Month view yet, see calendar-v1.md). No read action exists
 * for calendar events by design (see mission-8's C1 report): pages in this
 * app read through `db` directly in the Server Component, same as the
 * dashboard, so this page owns its own range query.
 */
export default async function CalendarPage() {
  // Only to decide whether CalendarViews should ever show create/edit/
  // delete controls (C4) — the real gate is each write action's own
  // MANAGER_ROLES check in actions/calendar.ts. Reuses the DAL's cached
  // loadSessionUser(), so this doesn't add a second lookup beyond what the
  // (app) layout above already does for the header.
  const user = await getVerifiedUser();
  const canManage = user !== null && MANAGER_ROLES.includes(user.role);

  const serverNow = new Date();
  const windowStart = addDays(serverNow, -WINDOW_DAYS);
  const windowEnd = addDays(serverNow, WINDOW_DAYS);

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
  }));

  return (
    <div className="py-2">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Calendar</h1>
      <div className="mt-4">
        <CalendarViews events={eventViews} canManage={canManage} />
      </div>
    </div>
  );
}
