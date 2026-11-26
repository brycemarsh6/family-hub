import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { RewardsBoard } from "@/components/RewardsBoard";
import { requireVerifiedUser } from "@/lib/dal";
import { loadHouseholdPeople } from "@/lib/householdPeople";
import { loadRewards } from "@/lib/rewardsRead";
import { canManageRewards, canRedeemRewards } from "@/lib/rewards/access";
import { MANAGE_BUTTON_LABEL, REWARDS_PAGE_TITLE } from "@/lib/rewardVocabulary";
import { loadStarBanks } from "@/lib/starBankRead";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await requireVerifiedUser();
  const people = await loadHouseholdPeople();
  const ids = people.map((person) => person.id);
  const [banks, rewards] = await Promise.all([loadStarBanks(ids), loadRewards(ids)]);

  const canManage = canManageRewards(user.role);

  return (
    <div className="py-2" data-page-width="wide">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{REWARDS_PAGE_TITLE}</h1>
        {canManage && (
          <Link
            href="/rewards/manage"
            className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-bold text-fg transition-colors active:bg-surface-2"
          >
            <SlidersHorizontal aria-hidden="true" size={16} />
            {MANAGE_BUTTON_LABEL}
          </Link>
        )}
      </div>
      <RewardsBoard
        people={people}
        banks={banks}
        rewards={rewards}
        viewerId={user.userId}
        canManage={canManage}
        canRedeem={canRedeemRewards(user.role)}
      />
    </div>
  );
}
