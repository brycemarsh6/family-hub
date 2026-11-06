import Link from "next/link";
import { BarChart3, ChevronRight, Plus, SlidersHorizontal } from "lucide-react";
import { HabitFamilyView } from "@/components/HabitFamilyView";
import { HabitTodayList } from "@/components/HabitTodayList";
import { HabitViewChips } from "@/components/HabitViewChips";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { loadTodayPage } from "@/lib/habitsRead";
import { loadFamilyPage } from "@/lib/habitsStatsRead";
import { formatCalendarDate } from "@/lib/householdDate";
import { formatDayLabel } from "@/lib/mealPlanDates";
import { REPORT_LABELS } from "@/lib/habitVocabulary";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function HabitsPage({ searchParams }: { searchParams: Promise<{ view?: string; person?: string }> }) {
  const user = await requireVerifiedUser();
  const { view, person } = await searchParams;
  const today = householdToday(new Date())!;
  const viewer = { userId: user.userId, role: user.role };
  // The wall tablet always shows the whole family (it has no Today of its own); a person picks with the chips (decision 95).
  const family = user.isDevice || view === "family";
  const familyPage = family ? await loadFamilyPage(viewer, today) : null;
  const todayPage = family ? null : await loadTodayPage(viewer, today);
  // A shared device (the wall tablet) can tick things off but never edit.
  const canManage = !user.isDevice;

  return (
    <div className={`py-2 ${familyPage ? "md:flex md:min-h-0 md:flex-1 md:flex-col" : ""}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Habits &amp; Chores</h1>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/habits/manage"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold"
            >
              <SlidersHorizontal aria-hidden="true" size={18} />
              Manage
            </Link>
            <Link
              href="/habits/new"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg"
            >
              <Plus aria-hidden="true" size={18} />
              New
            </Link>
          </div>
        )}
      </div>
      {!user.isDevice && <HabitViewChips view={family ? "family" : "mine"} />}
      {familyPage ? (
        <>
          <p className="mb-3 text-sm text-muted">{formatDayLabel(new Date(today.year, today.month - 1, today.day))} · the whole family</p>
          {/* The tablet shows everyone's streaks; a person's switch hides theirs (decision 98). */}
          <HabitFamilyView page={familyPage} showStreaks={user.isDevice || user.showStreaks} canManage={canManage} focusPersonId={person} />
        </>
      ) : (
        todayPage && (
          <HabitTodayList
            rows={todayPage.rows}
            todayLabel={formatDayLabel(new Date(today.year, today.month - 1, today.day))}
            canManage={canManage}
            nudges={todayPage.nudges}
            confetti={todayPage.confetti}
            choreStreak={todayPage.choreStreak}
            shoutOut={todayPage.shoutOut}
            vacationThrough={todayPage.vacationThrough}
            prompts={todayPage.prompts}
            // The tablet shows everyone's streaks; a person's switch hides theirs (decision 98).
            showStreaks={user.isDevice || user.showStreaks}
            todayKey={formatCalendarDate(today)}
          />
        )
      )}
      {/* The one way in to the Report (decision 163); the tablet never sees it. */}
      {canManage && (
        <Link href="/habits/report" className={`mt-5 flex min-h-15 items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-1.5 ${familyPage ? "md:hidden" : ""}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg">
            <BarChart3 aria-hidden="true" size={20} />
          </div>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base font-semibold">{REPORT_LABELS.title}</span>
            <span className="text-sm text-muted">{REPORT_LABELS.linkHint}</span>
          </span>
          <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
        </Link>
      )}
    </div>
  );
}
