import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { GoalDetail } from "@/components/GoalDetail";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { loadGoal } from "@/lib/goalsRead";
import { lifeAreaInfo } from "@/lib/goalVocabulary";
import { calendarDateInZone, utcMidnightInstant } from "@/lib/householdDate";

export const dynamic = "force-dynamic";

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireVerifiedUser();
  const today = householdToday(new Date())!;

  const goal = await loadGoal(id, { userId: user.userId, isDevice: user.isDevice }, today);
  if (!goal) notFound();

  // The date is stored as UTC midnight; read it back as UTC so it can't slip a day.
  const by = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    utcMidnightInstant(calendarDateInZone(goal.targetDate, "UTC")),
  );
  const whose =
    goal.ownerId === user.userId ? "Mine" : goal.ownerId === null ? "Together" : (goal.owner?.displayName ?? "Together");

  return (
    <div className="py-2">
      <BackLink href="/plans?view=goals" label="Goals" />

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{goal.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {lifeAreaInfo(goal.area).short} · {whose} · by {by}
        {goal.visibility === "private" && (
          <>
            {" · "}
            <Lock aria-hidden="true" className="inline-block align-[-2px]" size={14} /> Private
          </>
        )}
      </p>
      {goal.why && <p className="mt-2 text-sm italic text-muted">Why: {goal.why}</p>}

      <div className="mt-4">
        <GoalDetail goal={goal} today={today} />
      </div>
    </div>
  );
}
