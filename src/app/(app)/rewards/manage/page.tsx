import { redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { RewardsManage } from "@/components/RewardsManage";
import { requireVerifiedUser } from "@/lib/dal";
import { loadHouseholdAdults, loadHouseholdPeople } from "@/lib/householdPeople";
import { manageGate } from "@/lib/rewardGates";
import { loadRewards } from "@/lib/rewardsRead";
import { canManageRewards } from "@/lib/rewards/access";
import { isWish } from "@/lib/rewards/rewardRules";
import { loadPinStatus } from "@/lib/rewardSettingsRead";
import { MANAGE_PAGE_TITLE } from "@/lib/rewardVocabulary";
import { loadRecentActivity } from "@/lib/starHistoryRead";

export const dynamic = "force-dynamic";

export default async function RewardsManagePage() {
  const user = await requireVerifiedUser();
  if (!canManageRewards(user.role)) redirect("/rewards");

  const [people, adults] = await Promise.all([loadHouseholdPeople(), loadHouseholdAdults()]);
  const [rewards, recent, pinStatus] = await Promise.all([loadRewards(people.map((person) => person.id)), loadRecentActivity(new Date()), loadPinStatus()]);
  // Set cost opens the parent reward sheet; its PIN answer comes from the one gate.
  const gate = manageGate({ userId: user.userId, role: user.role }, pinStatus);
  // The form opens on the first kid (anyone who is not an adult), else the first person.
  const adultIds = new Set(adults.map((adult) => adult.id));
  const defaultPersonId = (people.find((person) => !adultIds.has(person.id)) ?? people[0])?.id ?? "";

  return (
    <div className="py-2" data-page-width="wide">
      <BackLink href="/rewards" label="Rewards" />
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">{MANAGE_PAGE_TITLE}</h1>
      <RewardsManage people={people} wishes={rewards.filter(isWish)} recent={recent} defaultPersonId={defaultPersonId} gate={gate} />
    </div>
  );
}
