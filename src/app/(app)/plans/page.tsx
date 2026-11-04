import { PlansTabs } from "@/components/PlansTabs";
import { ThisWeekList } from "@/components/ThisWeekList";
import { GoalsList } from "@/components/GoalsList";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { loadPlansPage } from "@/lib/goalsRead";

export const dynamic = "force-dynamic";

export default async function PlansPage({
  searchParams,
}: {
  // Next hands a string[] for a repeated key ("?view=a&view=b"); take the first.
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const user = await requireVerifiedUser();
  const { view: rawView } = await searchParams;
  const first = Array.isArray(rawView) ? rawView[0] : rawView;
  const view = first === "goals" ? "goals" : "week";

  const viewer = { userId: user.userId, isDevice: user.isDevice };
  const data = await loadPlansPage(viewer, householdToday(new Date())!);

  return (
    <div className="py-2">
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">Plans &amp; Goals</h1>
      <PlansTabs view={view} />
      {view === "goals" ? (
        <GoalsList data={data} canManage={!user.isDevice} viewerId={user.userId} />
      ) : (
        <ThisWeekList data={data} viewer={viewer} />
      )}
    </div>
  );
}
