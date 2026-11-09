import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChartNoAxesColumn } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { HabitForm } from "@/components/HabitForm";
import { hoursInitialOf } from "@/lib/habitHoursVocabulary";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { loadHabitRoster, loadTodayPage } from "@/lib/habitsRead";
import { addCalendarDays, formatCalendarDate, startOfWeek } from "@/lib/householdDate";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function EditHabitPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireVerifiedUser();
  // A shared device (the wall tablet) can tick things off but never edit.
  if (user.isDevice) redirect("/habits");
  const { id } = await params;
  const today = householdToday(new Date())!;
  const { manage, archived } = await loadTodayPage({ userId: user.userId, role: user.role }, today);
  const habit = [...manage, ...archived].find((item) => item.id === id);
  if (!habit) notFound();

  const thisSunday = startOfWeek(today);
  const people = await loadHabitRoster();

  return (
    <div className="py-2" data-page-width="wide">
      <BackLink href="/habits/manage" label="Manage" />
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
        thisSunday={formatCalendarDate(thisSunday)}
        nextSunday={formatCalendarDate(addCalendarDays(thisSunday, 7))}
        initial={{ ...habit, ...hoursInitialOf(habit.hours) }}
      />
    </div>
  );
}
