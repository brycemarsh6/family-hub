import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { HabitStats } from "@/components/HabitStats";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { loadHabitStats } from "@/lib/habitsStatsRead";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function HabitStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const today = householdToday(new Date())!;
  // Null for a missing habit and for one the viewer may not open (decision 102): the same page.
  const data = await loadHabitStats({ userId: user.userId, role: user.role }, id, today);
  if (!data) notFound();

  return (
    // Wide page: lifts the 768px cap on a landscape iPad (STRUCTURE.md "Wide pages", mission-53).
    <div data-page-width="wide" className="py-2">
      <BackLink href="/habits" label="Habits & Chores" />
      <HabitStats data={data} />
    </div>
  );
}
