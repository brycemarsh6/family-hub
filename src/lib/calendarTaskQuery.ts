// The Task SELECT + mapper behind the Calendar's task list. Two callers ask
// for the same thing, the Calendar page (a padded window around the viewed
// period) and `fetchTasks` in actions/tasks.ts (the Schedule view's endless
// scroll), so the query lives once here, beside calendarEventQuery.ts, for
// the same reason that file exists: a duplicated Prisma `select` quietly
// drifts. The CalendarTaskView is built field by field, never `{ ...row }`.
// Carries `server-only` because it owns the `db` query.

import "server-only";
import { db } from "./db";
import type { CalendarTaskView } from "./types";

/**
 * Tasks whose due date falls in `[dueStart, dueEnd)`, soonest first. A Task
 * has one due date, not a start/end span, so "in range" is a plain
 * point-in-window test rather than the events query's overlap test.
 * `dueDate` is stored at UTC midnight (Task's own schema comment, the same
 * all-day convention CalendarEvent uses), so the bounds are used exactly as
 * given: the page passes its already padded window, `fetchTasks` passes
 * bounds it converted with `localDayToAllDayInstant`.
 *
 * `deactivatedAt` is selected on each task's own people so the fact lives on
 * the TASK, never inferred from a roster scoped to one window (a task loaded
 * from far outside the page's window would otherwise carry no opinion about
 * a deactivated assignee). `isMine` is computed here from real TaskPerson
 * rows against the verified viewer, never from a role or user object handed
 * down; it decides only whether a mark-complete control is DRAWN, since
 * completeTask's own membership guard is the real gate. A null viewer (no
 * session) gets false.
 */
export async function getTasksInDueRange(
  dueStart: Date,
  dueEnd: Date,
  viewerUserId: string | null,
): Promise<CalendarTaskView[]> {
  const tasks = await db.task.findMany({
    where: { dueDate: { gte: dueStart, lt: dueEnd } },
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      title: true,
      details: true,
      dueDate: true,
      completedAt: true,
      people: {
        select: {
          user: {
            select: { id: true, displayName: true, avatarColor: true, deactivatedAt: true },
          },
        },
      },
    },
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    details: task.details,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    people: task.people.map((person) => ({
      userId: person.user.id,
      displayName: person.user.displayName,
      avatarColor: person.user.avatarColor,
      deactivated: person.user.deactivatedAt !== null,
    })),
    isMine: viewerUserId !== null && task.people.some((person) => person.user.id === viewerUserId),
  }));
}
