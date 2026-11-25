"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { RedeemSheet } from "./RedeemSheet";
import { RewardCard } from "./RewardCard";
import { RewardPersonChips } from "./RewardPersonChips";
import { RewardSheet } from "./RewardSheet";
import { StarBank } from "./StarBank";
import { setHideEarned, useHideEarned } from "@/lib/hideEarned";
import type { HouseholdPerson } from "@/lib/householdPeople";
import type { RewardView } from "@/lib/rewardsRead";
import { visibleRewards } from "@/lib/rewards/rewardRules";
import { REWARD_ADD_LABEL, REWARD_EMPTY_OTHER, REWARD_EMPTY_PARENT, REWARD_HIDE_EARNED_LABEL, addRewardForText } from "@/lib/rewardVocabulary";

// What the open redeem sheet was started with. It is kept as a copy: the page
// refreshes after a redeem (the reward is now earned, the bank lower), and the
// celebration must not vanish with it.
type RedeemTarget = { reward: RewardView; ownerName: string; bank: number };
type SheetState = { initial?: RewardView; ownerId: string };

/**
 * The Rewards page body. On a phone one person shows at a time, picked from a
 * row of chips; when the page is wide (a container variant, never a screen
 * breakpoint) every person gets a column and the chips go away. Only the
 * markup differs: it is one set of columns, with the others hidden when narrow.
 */
export function RewardsBoard({
  people,
  banks,
  rewards,
  viewerId,
  canManage,
  canRedeem,
}: {
  people: HouseholdPerson[];
  banks: Record<string, number>;
  rewards: RewardView[];
  viewerId: string;
  canManage: boolean;
  canRedeem: boolean;
}) {
  const hideEarned = useHideEarned();
  const [selectedId, setSelectedId] = useState(() => (people.some((person) => person.id === viewerId) ? viewerId : (people[0]?.id ?? "")));
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [redeeming, setRedeeming] = useState<RedeemTarget | null>(null);

  const closeSheet = () => setSheet(null);
  const closeRedeem = () => setRedeeming(null);

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          role="switch"
          aria-checked={hideEarned}
          onClick={() => setHideEarned(!hideEarned)}
          className="flex min-h-12 items-center gap-2 rounded-xl pl-3 text-sm font-medium text-muted active:bg-surface-2"
        >
          {REWARD_HIDE_EARNED_LABEL}
          <span aria-hidden="true" className={`flex h-7 w-12 items-center rounded-full border-2 transition-colors ${hideEarned ? "border-transparent bg-accent" : "border-muted bg-surface-2"}`}>
            <span className={`rounded-full transition-transform ${hideEarned ? "h-6 w-6 translate-x-5 bg-surface shadow" : "h-4 w-4 translate-x-1 bg-muted"}`} />
          </span>
        </button>
      </div>

      <div className="@container">
        <div className="@min-[48rem]:hidden">
          <RewardPersonChips people={people} banks={banks} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="grid grid-cols-1 gap-3 @min-[48rem]:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]">
          {people.map((person) => {
            const bank = banks[person.id] ?? 0;
            const shown = visibleRewards(
              rewards.filter((reward) => reward.ownerId === person.id),
              hideEarned,
            );
            return (
              <section
                key={person.id}
                aria-label={person.displayName}
                className={`min-w-0 rounded-2xl @min-[48rem]:bg-surface-2/40 @min-[48rem]:p-3 ${person.id === selectedId ? "" : "hidden @min-[48rem]:block"}`}
              >
                <div className="mb-3 hidden items-center gap-3 @min-[48rem]:flex">
                  <AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} />
                  <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{person.displayName}</h2>
                  <StarBank stars={bank} />
                </div>
                {shown.length === 0 && <p className="mb-3 text-sm text-muted">{canManage ? REWARD_EMPTY_PARENT : REWARD_EMPTY_OTHER}</p>}
                <ul className="flex flex-col gap-3">
                  {shown.map((reward) => (
                    <RewardCard
                      key={reward.id}
                      reward={reward}
                      bank={bank}
                      canRedeem={canRedeem}
                      onEdit={canManage ? () => setSheet({ initial: reward, ownerId: person.id }) : undefined}
                      onRedeem={() => setRedeeming({ reward, ownerName: person.displayName, bank })}
                    />
                  ))}
                </ul>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setSheet({ ownerId: person.id })}
                    className="mt-3 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line-strong text-base font-semibold text-muted active:bg-surface-2"
                  >
                    <Plus aria-hidden="true" size={18} />
                    <span className="@min-[48rem]:hidden">{addRewardForText(person.displayName)}</span>
                    <span className="hidden @min-[48rem]:inline">{REWARD_ADD_LABEL}</span>
                  </button>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {sheet && (
        <RewardSheet
          // A new key per target, so a different reward never inherits the last one's fields.
          key={sheet.initial?.id ?? `new-${sheet.ownerId}`}
          initial={sheet.initial}
          ownerId={sheet.ownerId}
          people={people}
          onClose={closeSheet}
        />
      )}
      {redeeming && <RedeemSheet reward={redeeming.reward} ownerName={redeeming.ownerName} bank={redeeming.bank} onClose={closeRedeem} />}
    </>
  );
}
