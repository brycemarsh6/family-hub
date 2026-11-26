import { redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { HabitForm } from "@/components/HabitForm";
import { requireVerifiedUser } from "@/lib/dal";
import { canSetStars } from "@/lib/rewards/access";
import { householdToday } from "@/lib/assistant/today";
import { loadHabitRoster } from "@/lib/habitsRead";
import { manageHref, personParam, resolveManagePerson } from "@/lib/habitsManage";
import { addCalendarDays, formatCalendarDate, startOfWeek } from "@/lib/householdDate";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function NewHabitPage({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  const user = await requireVerifiedUser();
  // A shared device (the wall tablet) can tick things off but never edit.
  if (user.isDevice) redirect("/habits");
  const { person } = await searchParams;
  const thisSunday = startOfWeek(householdToday(new Date())!);
  // Everyone the picker can offer: active people, not the shared tablet login.
  const people = await loadHabitRoster();
  // Started from someone's Manage list: that person is picked, and saving returns there (mission 88).
  const subjectId = resolveManagePerson({ userId: user.userId, role: user.role }, person, people);
  const returnHref = manageHref(personParam(subjectId, user.userId));

  return (
    <div className="py-2" data-page-width="wide">
      <BackLink href={returnHref} label="Manage" />
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">New habit or chore</h1>
      <HabitForm
        people={people}
        viewerId={user.userId}
        canSetStars={canSetStars(user.role)}
        returnHref={returnHref}
        forPersonId={subjectId}
        thisSunday={formatCalendarDate(thisSunday)}
        nextSunday={formatCalendarDate(addCalendarDays(thisSunday, 7))}
      />
    </div>
  );
}
