import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { ChoreChart } from "@/components/ChoreChart";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { loadChoreChart } from "@/lib/habitsRead";
import { CHORE_CHART_LABELS } from "@/lib/habitVocabulary";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function ChoreChartPage({ searchParams }: { searchParams: Promise<{ person?: string; view?: string }> }) {
  const user = await requireVerifiedUser();
  // A shared device (the wall tablet) can tick things off but never edit.
  if (user.isDevice) redirect("/habits");
  const { person, view } = await searchParams;
  const today = householdToday(new Date())!;
  const chart = await loadChoreChart({ userId: user.userId, role: user.role }, person || user.userId, today);
  // Not yours to edit, or not a person in this household.
  if (!chart) notFound();

  return (
    // Wide page: lifts the 768px cap on a landscape iPad (STRUCTURE.md "Wide pages", mission-53).
    <div data-page-width="wide" className="py-2">
      <BackLink href="/habits/manage" label="Manage" />
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{CHORE_CHART_LABELS.title}</h1>
      <p className="mt-1 mb-4 text-sm text-muted">{chart.subtitle}</p>
      <ChoreChart chart={chart} view={view === "default" ? "default" : "week"} />
    </div>
  );
}
