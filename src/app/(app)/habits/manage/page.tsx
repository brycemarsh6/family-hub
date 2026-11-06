import { redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { HabitManager } from "@/components/HabitManager";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { loadTodayPage } from "@/lib/habitsRead";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function ManageHabitsPage() {
  const user = await requireVerifiedUser();
  // A shared device (the wall tablet) can tick things off but never edit.
  if (user.isDevice) redirect("/habits");
  const today = householdToday(new Date())!;
  const { manage, archived } = await loadTodayPage({ userId: user.userId, role: user.role }, today);

  return (
    <div className="py-2">
      <BackLink href="/habits" label="Habits & Chores" />
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manage</h1>
      <p className="mt-1 text-sm text-muted">Tap a row to edit. Drag the grip to reorder.</p>
      <HabitManager active={manage} archived={archived} />
    </div>
  );
}
