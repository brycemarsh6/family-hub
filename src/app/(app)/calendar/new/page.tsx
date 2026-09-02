import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { BackLink } from "@/components/BackLink";
import { EventForm } from "@/components/EventForm";

export const dynamic = "force-dynamic";

/**
 * Add an event — reached from the "+" → Event on `/calendar` (carrying
 * `?date=` for "the day in view", per the plan's screenshot-4 fan-out) or
 * directly by URL. Gated server-side, same shape as every other
 * manager-only page in this app: `requireVerifiedUser()` bounces a
 * signed-out visitor to `/login` (pages use the redirecting DAL form, per
 * STRUCTURE.md's guard-form rule), and a signed-in kid is redirected to
 * `/calendar` rather than shown a form they can't submit — the action's
 * own MANAGER_ROLES check in actions/calendar.ts remains the real gate;
 * this redirect is only so a kid isn't left staring at dead controls.
 */
export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireVerifiedUser();
  if (!MANAGER_ROLES.includes(user.role)) {
    redirect("/calendar");
  }

  const { date } = await searchParams;
  // "YYYY-MM-DD" parsed as local midnight, not UTC — the same
  // toDateInputValue/parse pairing PantryItemEditSheet's own date field
  // uses, so a date CalendarViews already decided on the browser's clock
  // isn't reinterpreted through the server's. This is parsing an EXPLICIT
  // string the client handed us, not deciding "what day is it" ourselves —
  // the rule that date belongs to the client is about the latter.
  const initialDate = date ? new Date(`${date}T00:00:00`) : undefined;

  // The full household roster, kids included — an event can be FOR a kid
  // (a soccer practice) even though only a manager can create one. Narrow
  // select, no passwordHash — the same nested-select shape the calendar
  // page's own people join and personInfo.ts's rule both already sanction.
  const people = await db.user.findMany({
    where: { deactivatedAt: null },
    select: { id: true, displayName: true, avatarColor: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="py-2">
      <BackLink href="/calendar" label="Calendar" />

      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
        New event
      </h1>

      <EventForm
        people={people.map((person) => ({
          userId: person.id,
          displayName: person.displayName,
          avatarColor: person.avatarColor,
        }))}
        currentUserId={user.userId}
        initialDate={initialDate}
      />
    </div>
  );
}
