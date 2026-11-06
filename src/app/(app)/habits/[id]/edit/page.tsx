import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { HabitForm } from "@/components/HabitForm";
import { requireVerifiedUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { householdToday } from "@/lib/assistant/today";
import { loadTodayPage } from "@/lib/habitsRead";
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
  const people = await db.user.findMany({
    where: { deactivatedAt: null, role: { not: "device" } },
    select: { id: true, displayName: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="py-2">
      <BackLink href="/habits/manage" label="Manage" />
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">Edit habit</h1>
      <HabitForm
        people={people}
        viewerId={user.userId}
        thisSunday={formatCalendarDate(thisSunday)}
        nextSunday={formatCalendarDate(addCalendarDays(thisSunday, 7))}
        initial={habit}
      />
    </div>
  );
}
