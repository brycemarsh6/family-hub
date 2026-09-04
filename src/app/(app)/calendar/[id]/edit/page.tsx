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
      where: { deactivatedAt: null },
      select: { id: true, displayName: true, avatarColor: true },
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
          displayName: person.displayName,
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
