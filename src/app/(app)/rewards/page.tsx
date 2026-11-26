import { RewardsBoard } from "@/components/RewardsBoard";
import { requireVerifiedUser } from "@/lib/dal";
import { loadHouseholdPeople } from "@/lib/householdPeople";
import { loadRewards } from "@/lib/rewardsRead";
import { rewardRights } from "@/lib/rewardGates";
import { loadPinStatus } from "@/lib/rewardSettingsRead";
import { REWARDS_PAGE_TITLE } from "@/lib/rewardVocabulary";
import { loadStarBanks } from "@/lib/starBankRead";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await requireVerifiedUser();
  const people = await loadHouseholdPeople();
  const ids = people.map((person) => person.id);
  const [banks, rewards, pinStatus] = await Promise.all([loadStarBanks(ids), loadRewards(ids), loadPinStatus()]);
  // The board never tests a role, a device or the PIN switch itself; it reads these answers.
  const rights = rewardRights({ userId: user.userId, role: user.role }, ids, pinStatus);

  return (
    <div className="py-2" data-page-width="wide">
      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">{REWARDS_PAGE_TITLE}</h1>
      <RewardsBoard
        people={people}
        banks={banks}
        rewards={rewards}
        viewerId={user.userId}
        rights={rights}
      />
    </div>
  );
}
