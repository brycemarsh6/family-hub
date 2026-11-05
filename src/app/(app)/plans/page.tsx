import { PlansTabs } from "@/components/PlansTabs";
import { ThisWeekList } from "@/components/ThisWeekList";
import { GoalsList } from "@/components/GoalsList";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { loadPlansPage, loadWeekRecap } from "@/lib/goalsRead";
import { VisionBoard } from "@/components/VisionBoard";
import { DEFAULT_VISION_HORIZON, toVisionHorizon } from "@/lib/goalVocabulary";
import { loadVisionBoard } from "@/lib/visionsRead";

export const dynamic = "force-dynamic";

function newPromptSeed() {
  return Math.floor(Math.random() * 1000);
}

export default async function PlansPage({
  searchParams,
}: {
  // Next hands a string[] for a repeated key ("?view=a&view=b"); take the first.
  searchParams: Promise<{ view?: string | string[]; board?: string | string[]; years?: string | string[] }>;
}) {
  const user = await requireVerifiedUser();
  const params = await searchParams;
  const firstOf = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const rawView = firstOf(params.view);
  const view = rawView === "goals" || rawView === "vision" ? rawView : "week";

  const viewer = { userId: user.userId, isDevice: user.isDevice };
  const today = householdToday(new Date())!;

  if (view === "vision") {
    const horizon = toVisionHorizon(firstOf(params.years)) ?? DEFAULT_VISION_HORIZON;
    const board = await loadVisionBoard(viewer, firstOf(params.board), horizon, today);
    return (
      <div className="py-2">
        <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">Plans &amp; Goals</h1>
        <PlansTabs view={view} />
        <VisionBoard
          data={board}
          horizon={horizon}
          todayYear={today.year}
          // Made here, once per request, so the server and the browser pick the same first prompt.
          promptSeed={newPromptSeed()}
        />
      </div>
    );
  }

  const data = await loadPlansPage(viewer, today);
  // Sundays only; null every other day, and only This week shows it.
  const recap = view === "week" ? await loadWeekRecap(viewer, today) : null;

  return (
    <div className="py-2">
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">Plans &amp; Goals</h1>
      <PlansTabs view={view} />
      {view === "goals" ? (
        <GoalsList data={data} canManage={!user.isDevice} viewerId={user.userId} />
      ) : (
        <ThisWeekList data={data} viewer={viewer} recap={recap} />
      )}
    </div>
  );
}
