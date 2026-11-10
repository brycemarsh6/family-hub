import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { resolveServerFetchWindow } from "@/lib/calendarPaging";
import { getCalendarEventsInRange } from "@/lib/calendarEventQuery";
import { getTasksInDueRange } from "@/lib/calendarTaskQuery";
import { loadPlannedHabitDays } from "@/lib/habitsStatsRead";
import { localDayToAllDayInstant } from "@/lib/calendarDates";
import { startOfDay } from "@/lib/mealPlanDates";
import { CalendarViews } from "@/components/CalendarViews";
import { CalendarPullProvider } from "@/components/CalendarPullButton";
import { loadCalendarPullState } from "@/lib/linkedCalendarsRead";
import type { CalendarPersonView } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The Calendar branch's landing page. This page still reads through the
 * database directly, in the Server Component, same as the dashboard — it
 * has no `searchParams`-shaped need for a client-triggered fetch, unlike
 * the Schedule view's endless scroll (mission-15/C1), which is what
 * `fetchCalendarEvents` (actions/calendar.ts) exists for. Both callers now
 * share the same select/mapper via `calendarEventQuery.ts`, so this page's
 * own query and that action's can't drift apart from each other.
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

  // Three independent queries, in ONE Promise.all — mission-14/C2 made it
  // two (events + tasks); C5 adds the household roster as a third rather
  // than a sequential `await` after it, for the same reason: this used to
  // be a single `await db.calendarEvent.findMany(...)` with a comment
  // claiming there was nothing else on the page to batch it with, and that
  // stopped being true the moment tasks (and now the roster, for
  // TaskForm's people picker) needed to render here too. Sequential
  // `await db.…` calls on a force-dynamic page are each their own
  // cross-country round trip (CLAUDE.md's performance section, from the
  // Inventory fix this mirrors) — batching keeps this page at ONE round
  // trip's worth of latency for three queries, not three.
  const [eventViews, taskViews, roster, habitDays, pullState] = await Promise.all([
    // Events joined with their people in the same round trip (Prisma's
    // nested `select`, not a second query) — the select and the
    // row→CalendarEventView mapping both moved to calendarEventQuery.ts in
    // mission-15/C1, which is now this page's ONLY caller until
    // `fetchCalendarEvents` (actions/calendar.ts) becomes its second, for
    // the Schedule view's endless scroll. See that module's own comment for
    // why (the personInfo.ts precedent, and why this one carries
    // `server-only` when personInfo.ts doesn't).
    getCalendarEventsInRange(windowStart, windowEnd),
    // Tasks in the same padded window (calendarTaskQuery.ts says why the
    // bounds need no separate skew handling, and owns `isMine`).
    getTasksInDueRange(windowStart, windowEnd, user ? user.userId : null),
    // The full household roster, kids included — a task can be reassigned
    // to a kid even though only a manager can open the edit view
    // (TaskDetailSheet's own `canManage` gate).
    //
    // mission-16/C8 (Captain's N5): active, PLUS anyone already assigned to
    // a task somewhere in THIS window — the same "active, plus already on
    // it" shape calendar/[id]/edit/page.tsx already uses for a single
    // event, adapted here to a whole fetched RANGE of tasks rather than one
    // id, since this page (unlike that one) has no single task to key an
    // OR-clause off of. Before this, TaskDetailSheet.tsx had no way to know
    // a person was deactivated except by INFERENCE — present in a task's
    // own assignee list but absent from this (then active-only) roster —
    // which only held because `User` rows are never deleted, a register
    // rule rather than a data guarantee. Filtering through the SAME
    // `windowStart`/`windowEnd` the tasks query above already uses (rather
    // than needing that query's own result first) is what keeps this
    // parallel-fetchable in the same `Promise.all` instead of becoming a
    // second, sequential round trip.
    db.user.findMany({
      where: {
        OR: [
          { deactivatedAt: null },
          { taskPeople: { some: { task: { dueDate: { gte: windowStart, lt: windowEnd } } } } },
        ],
      },
      select: { id: true, displayName: true, avatarColor: true, deactivatedAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // Planned habit days (Habits & Chores E2, decision 146): the viewer's own
    // only, so the tablet and anyone not on a habit get none. In the same
    // round trip as the rest.
    user
      ? loadPlannedHabitDays(
          { userId: user.userId, role: user.role },
          localDayToAllDayInstant(startOfDay(windowStart)),
          localDayToAllDayInstant(startOfDay(windowEnd)),
        )
      : Promise.resolve([]),
    // The Refresh button and the reconnect banner (mission 60): two small
    // reads in the same round trip. Refresh is for parents and admins, never
    // a device login (the action refuses anyone else too).
    user
      ? loadCalendarPullState(user.userId, canManage && !user.isDevice)
      : Promise.resolve({ showRefresh: false, relinkEmails: [] }),
  ]);

  const people: CalendarPersonView[] = roster.map((person) => ({
    userId: person.id,
    displayName: person.displayName,
    avatarColor: person.avatarColor,
    // mission-16/C8 — real field, not a suffix baked into displayName
    // above; see CalendarPersonView's own comment (src/lib/types.ts).
    deactivated: person.deactivatedAt !== null,
  }));

  // This `py-2` is load-bearing: CalendarHeader's lift/pinned margin and
  // loading.tsx's 143px skeleton offset both depend on it. Change it and
  // both must be re-derived. The bottom half is dropped on the hour
  // timeline views (they fill the viewport; see AppChrome's `<main>`).
  // `data-page-width="wide"` lifts the 768px cap (STRUCTURE.md "Wide pages",
  // mission-46).
  return (
    <div data-page-width="wide" className="py-2 has-[[data-fills-viewport]]:pb-0">
      <CalendarPullProvider showRefresh={pullState.showRefresh} relinkEmails={pullState.relinkEmails}>
        <CalendarViews
          events={eventViews}
          tasks={taskViews}
          habitDays={habitDays}
          people={people}
          canManage={canManage}
          windowStart={windowStart}
          windowEnd={windowEnd}
          viewerId={user?.userId ?? null}
        />
      </CalendarPullProvider>
    </div>
  );
}
