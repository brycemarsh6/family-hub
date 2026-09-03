import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { parseDateParam } from "@/lib/calendarPaging";
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
  // Pass the raw "YYYY-MM-DD" STRING through, never a Date built from it —
  // `new Date(\`${date}T00:00:00\`)` (the pre-fix version of this line)
  // builds local midnight in the SERVER's zone, and a Date crossing this
  // Server-to-Client boundary is an instant, not a calendar day: on Vercel
  // (UTC) that instant reads back one day earlier in a Mountain browser,
  // on every single tap (mission-8, Strange's C4 pass-1 blocker). What's
  // actually guaranteed here is only that this is real client input, not
  // yet a decided day — EventForm is what turns it into a Date, in the
  // browser, from a split of this same string (parseLocalDateString, next
  // to combineDateAndTime). A malformed value is dropped rather than
  // passed through; EventForm falls back to today when it's undefined.
  //
  // Validity is checked with `parseDateParam` (calendarPaging.ts) — mission-
  // 10/C3, replacing a shape-only `/^\d{4}-\d{2}-\d{2}$/` regex that let
  // through calendar days that don't exist (`2026-02-30` matches that shape
  // fine) and handed EventForm a string its own `new Date(2026, 1, 30)`
  // rolls over to Mar 2 with no warning. `parseDateParam` round-trips the
  // parsed date back through `toLocalDateString` and rejects anything that
  // doesn't come back byte-identical, which a nonexistent day never does.
  // Its returned `Date` is discarded here — only the null/non-null verdict
  // is used — for the exact reason in the paragraph above: this page still
  // must never pass a `Date` itself across the Server-to-Client boundary.
  const initialDateISO = date && parseDateParam(date) ? date : undefined;

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
        initialDateISO={initialDateISO}
      />
    </div>
  );
}
