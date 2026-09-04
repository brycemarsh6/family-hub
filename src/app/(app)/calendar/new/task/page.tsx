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
 * Reachable from the "+" button's Add sheet since C4b — `CalendarViews.tsx`
 * routes its Task item here the same way its Event item routes to
 * `/calendar/new`.
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
