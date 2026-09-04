import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { parseDateParam } from "@/lib/calendarPaging";
import { BackLink } from "@/components/BackLink";
import { TaskForm } from "@/components/TaskForm";

export const dynamic = "force-dynamic";

/**
 * Add a task — the Task half of the Add sheet's "Event / Task" choice
 * (mission-13/CT1, `.avengers/plans/calendar-v2.md`'s decision 13).
 *
 * ⚠️ Not yet reachable from the "+" button. The real Add sheet lives inside
 * `CalendarViews.tsx` (its `addingEvent` ActionSheet, wired to
 * `CalendarHeader`'s `onAdd`) and today offers "Event" / "Meal" — not
 * "Event" / "Task". That file sits outside this contract's boundary
 * (mission-13/C4 explicitly lists it as must-not-touch), so swapping
 * "Meal" for a "Task" item that routes here (mirroring the existing
 * "Event" item's `router.push(\`/calendar/new\${dateParam}\`)` shape,
 * pointed at `/calendar/new/task` instead) is flagged back to Fury rather
 * than done here — see mission-13's handoff log / this contract's own
 * report for the exact wiring needed. Until that lands, this route is only
 * reachable by direct URL — same "the destination exists before the
 * trigger does" shape as CT2 rendering tasks in the calendar views (out of
 * this contract's scope on its own).
 *
 * Everything else about this page mirrors `/calendar/new` (the Event
 * equivalent) exactly: same server-side gate (`requireVerifiedUser()`
 * bounces a signed-out visitor to `/login`; a signed-in kid is redirected
 * to `/calendar` rather than shown a form they can't submit — the real
 * gate is `createTask`'s own `MANAGER_ROLES` check in `actions/tasks.ts`),
 * same `?date=` handling (the raw string is passed through, never a Date
 * built server-side — see `/calendar/new/page.tsx`'s own comment for the
 * full Server→Client instant-vs-day reasoning this avoids), same household
 * roster query.
 */
export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireVerifiedUser();
  if (!MANAGER_ROLES.includes(user.role)) {
    redirect("/calendar");
  }

  const { date } = await searchParams;
  const initialDateISO = date && parseDateParam(date) ? date : undefined;

  const people = await db.user.findMany({
    where: { deactivatedAt: null },
    select: { id: true, displayName: true, avatarColor: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="py-2">
      <BackLink href="/calendar" label="Calendar" />

      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
        New task
      </h1>

      <TaskForm
        people={people.map((person) => ({
          userId: person.id,
          displayName: person.displayName,
          avatarColor: person.avatarColor,
        }))}
        currentUserId={user.userId}
        initialDateISO={initialDateISO}
      />
    </div>
  );
}
