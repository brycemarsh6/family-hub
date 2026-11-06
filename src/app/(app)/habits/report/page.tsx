import { redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { HabitReportView } from "@/components/HabitReportView";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { parseReportParams, type RawReportParams } from "@/lib/habitsReportScope";
import { loadHabitReport } from "@/lib/habitsStatsRead";
import { REPORT_LABELS } from "@/lib/habitVocabulary";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function HabitReportPage({ searchParams }: { searchParams: Promise<RawReportParams> }) {
  const user = await requireVerifiedUser();
  // The wall tablet is on no items and has the family view as its one screen (decision 163).
  if (user.isDevice) redirect("/habits");
  const today = householdToday(new Date())!;
  const report = await loadHabitReport({ userId: user.userId, role: user.role }, parseReportParams(await searchParams, today), today);
  if (!report) redirect("/habits");

  return (
    <div className="py-2">
      <BackLink href="/habits" label="Habits & Chores" />
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">{REPORT_LABELS.title}</h1>
      <HabitReportView report={report} />
    </div>
  );
}
