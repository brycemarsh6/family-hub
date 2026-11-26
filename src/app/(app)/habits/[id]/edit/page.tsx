import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChartNoAxesColumn } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { HabitForm } from "@/components/HabitForm";
import { hoursInitialOf } from "@/lib/habitHoursVocabulary";
import { requireVerifiedUser } from "@/lib/dal";
import { canSetStars } from "@/lib/rewards/access";
import { householdToday } from "@/lib/assistant/today";
import { loadHabitForEdit, loadHabitRoster } from "@/lib/habitsRead";
import { manageHref, personParam, resolveManagePerson } from "@/lib/habitsManage";
import { addCalendarDays, formatCalendarDate, startOfWeek } from "@/lib/householdDate";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function EditHabitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ person?: string }> }) {
  const user = await requireVerifiedUser();
  // A shared device (the wall tablet) can tick things off but never edit.
  if (user.isDevice) redirect("/habits");
  const { id } = await params;
  const { person } = await searchParams;
  const today = householdToday(new Date())!;
  // Any habit this login may edit, a kid's chore included for a parent, not only their own.
  const habit = await loadHabitForEdit({ userId: user.userId, role: user.role }, id);
  if (!habit) notFound();

  const thisSunday = startOfWeek(today);
  const people = await loadHabitRoster();
  // Back and after-save return to the Manage list the habit was opened from (mission 89).
  const returnHref = manageHref(personParam(resolveManagePerson({ userId: user.userId, role: user.role }, person, people), user.userId));

  return (
    <div className="py-2" data-page-width="wide">
      <BackLink href={returnHref} label="Manage" />
      <Link
        href={`/habits/${habit.id}`}
        className="mb-3 ml-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent"
      >
        <ChartNoAxesColumn aria-hidden="true" size={16} />
        See stats
      </Link>
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">Edit habit</h1>
      <HabitForm
        people={people}
        viewerId={user.userId}
        canSetStars={canSetStars(user.role)}
        thisSunday={formatCalendarDate(thisSunday)}
        nextSunday={formatCalendarDate(addCalendarDays(thisSunday, 7))}
        returnHref={returnHref}
        initial={{ ...habit, ...hoursInitialOf(habit.hours) }}
      />
    </div>
  );
}
