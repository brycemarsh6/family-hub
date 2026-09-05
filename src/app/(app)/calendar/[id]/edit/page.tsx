import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { BackLink } from "@/components/BackLink";
import { EventForm } from "@/components/EventForm";

export const dynamic = "force-dynamic";

/**
 * Edit an event — reached from the detail sheet's Edit button. Same
 * server-side gate as `/calendar/new` (see that page's own comment): a
 * signed-out visitor bounces to `/login`, a signed-in kid to `/calendar`.
 * A missing/deleted id 404s cleanly, the same RecipeForm-precedent shape
 * `/kitchen/cooking/recipes/[id]/edit/page.tsx` already uses.
 *
 * mission-16/C3b: the roster below is "active, PLUS anyone already on THIS
 * event" — the relation filter (`calendarEventPeople: { some: { eventId } }`)
 * reads that fact fresh from the database for this specific event, never
 * from anything the client sent, so a deactivated assignee's chip still
 * renders in EventForm's picker instead of silently vanishing (and taking
 * their assignment with it on Save — `updateCalendarEvent`'s own carve-out
 * in actions/calendar.ts is the real guard; this is what makes the picker
 * tell the truth about who's on the event before Save is even tapped).
 * `/calendar/new/page.tsx`'s own roster query stays active-only on purpose
 * — there is no existing event there for anyone to already be on.
 */
export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireVerifiedUser();
  if (!MANAGER_ROLES.includes(user.role)) {
    redirect("/calendar");
  }

  const { id } = await params;

  const [event, people] = await Promise.all([
    db.calendarEvent.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        notes: true,
        location: true,
        startAt: true,
        endAt: true,
        allDay: true,
        people: { select: { userId: true } },
      },
    }),
    db.user.findMany({
      where: {
        OR: [{ deactivatedAt: null }, { calendarEventPeople: { some: { eventId: id } } }],
      },
      select: { id: true, displayName: true, avatarColor: true, deactivatedAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!event) notFound();

  return (
    <div className="py-2">
      <BackLink href="/calendar" label="Calendar" />

      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
        Edit event
      </h1>

      <EventForm
        people={people.map((person) => ({
          userId: person.id,
          // A deactivated-but-already-on-this-event person only reaches
          // this array via the OR clause above — mark them right in the
          // label rather than adding a `deactivated` field to the shared
          // CalendarPersonView type (src/lib/types.ts), which every other
          // caller of that type would then have to account for. See this
          // file's own header comment for the full mission-16/C3b reasoning.
          displayName: person.deactivatedAt
            ? `${person.displayName} (no longer active)`
            : person.displayName,
          avatarColor: person.avatarColor,
        }))}
        currentUserId={user.userId}
        defaultValues={{
          id: event.id,
          title: event.title,
          allDay: event.allDay,
          startAt: event.startAt,
          endAt: event.endAt,
          location: event.location ?? "",
          notes: event.notes ?? "",
          userIds: event.people.map((person) => person.userId),
        }}
      />
    </div>
  );
}
