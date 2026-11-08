import { FloatingAddButton } from "@/components/FloatingAddButton";
import { HabitsDayView } from "@/components/HabitsDayView";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { resolveHabitsDay } from "@/lib/habitsDay";
import { loadTodayPage } from "@/lib/habitsRead";
import { loadFamilyPage } from "@/lib/habitsStatsRead";
import { formatCalendarDate } from "@/lib/householdDate";
import { formatDayLabel } from "@/lib/mealPlanDates";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function HabitsPage({ searchParams }: { searchParams: Promise<{ view?: string; person?: string; day?: string }> }) {
  const user = await requireVerifiedUser();
  const { view, person, day: dayParam } = await searchParams;
  const realToday = householdToday(new Date())!;
  // `?day=` browses back up to 14 days, read only; anything else is today (decision 222).
  const { day, prev, next } = resolveHabitsDay(dayParam, realToday);
  const viewer = { userId: user.userId, role: user.role };
  // The wall tablet always shows the whole family (it has no Today of its own); a person picks in the Filter sheet (decision 95).
  const family = user.isDevice || view === "family";
  // The loaders work out every window from the day they are given, so the shown day goes in as their "today".
  const familyPage = family ? await loadFamilyPage(viewer, day) : null;
  const todayPage = family ? null : await loadTodayPage(viewer, day);
  // A shared device (the wall tablet) can tick things off but never edit.
  const canManage = !user.isDevice;

  return (
    <div data-page-width="wide" className={`py-2 ${familyPage ? "md:flex md:min-h-0 md:flex-1 md:flex-col" : ""}`}>
      <HabitsDayView
        // The Mine / Whole family switch is a link, so a fresh filter for each view.
        key={family ? "family" : "mine"}
        mine={todayPage}
        family={familyPage}
        day={formatCalendarDate(day)}
        todayKey={formatCalendarDate(realToday)}
        dateLabel={formatDayLabel(new Date(day.year, day.month - 1, day.day))}
        prev={prev}
        next={next}
        canManage={canManage}
        // The tablet shows everyone's streaks; a person's switch hides theirs (decision 98).
        showStreaks={user.isDevice || user.showStreaks}
        focusPersonId={person}
      />
      {canManage && <FloatingAddButton href="/habits/new" label="New habit or chore" />}
    </div>
  );
}
