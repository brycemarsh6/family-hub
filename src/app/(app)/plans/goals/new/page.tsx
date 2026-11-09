import { redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { GoalForm } from "@/components/GoalForm";
import { requireVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";

export const dynamic = "force-dynamic";

export default async function NewGoalPage() {
  const user = await requireVerifiedUser();
  // The wall tablet only logs habits; the action refuses a device too, this just spares it the form.
  if (user.isDevice) redirect("/plans");

  return (
    <div className="py-2" data-page-width="wide">
      <BackLink href="/plans?view=goals" label="Goals" />

      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">New goal</h1>

      <GoalForm mode="create" today={householdToday(new Date())!} />
    </div>
  );
}
