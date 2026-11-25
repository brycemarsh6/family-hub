import { RewardsBoard } from "@/components/RewardsBoard";
import { requireVerifiedUser } from "@/lib/dal";
import { loadHouseholdPeople } from "@/lib/householdPeople";
import { loadRewards } from "@/lib/rewardsRead";
import { canManageRewards, canRedeemRewards } from "@/lib/rewards/access";
import { REWARDS_PAGE_TITLE } from "@/lib/rewardVocabulary";
import { loadStarBanks } from "@/lib/starBankRead";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await requireVerifiedUser();
  const people = await loadHouseholdPeople();
  const ids = people.map((person) => person.id);
  const [banks, rewards] = await Promise.all([loadStarBanks(ids), loadRewards(ids)]);

  return (
    <div className="py-2" data-page-width="wide">
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">{REWARDS_PAGE_TITLE}</h1>
      <RewardsBoard
        people={people}
        banks={banks}
        rewards={rewards}
        viewerId={user.userId}
        canManage={canManageRewards(user.role)}
        canRedeem={canRedeemRewards(user.role)}
      />
    </div>
  );
}
