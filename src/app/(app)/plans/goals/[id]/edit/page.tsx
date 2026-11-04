import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { GoalForm, type GoalFormValues } from "@/components/GoalForm";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { loadGoal } from "@/lib/goalsRead";
import { calendarDateInZone, formatCalendarDate } from "@/lib/householdDate";

export const dynamic = "force-dynamic";

const TITLE_LINK_MAX = 24;

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireVerifiedUser();
  const today = householdToday(new Date())!;

  const goal = await loadGoal(id, { userId: user.userId, isDevice: user.isDevice }, today);
  if (!goal) notFound();
  if (!goal.canEdit) redirect("/plans/goals/" + id);

  const { measureUnit: unit, startValue: start, targetValue: target } = goal;
  const initial: GoalFormValues = {
    title: goal.title,
    area: goal.area,
    ownership: goal.ownerId === null ? "together" : "mine",
    visibility: goal.visibility,
    why: goal.why ?? "",
    targetDate: formatCalendarDate(calendarDateInZone(goal.targetDate, "UTC")),
    measure:
      unit !== null && start !== null && target !== null
        ? { unit, start: String(start), target: String(target) }
        : null,
  };
  const label =
    goal.title.length > TITLE_LINK_MAX ? goal.title.slice(0, TITLE_LINK_MAX) + "…" : goal.title;

  return (
    <div className="py-2">
      <BackLink href={"/plans/goals/" + id} label={label} />

      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">Edit goal</h1>

      <GoalForm mode="edit" goalId={id} initial={initial} today={today} />
    </div>
  );
}
