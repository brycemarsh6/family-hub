"use client";

import { useState } from "react";
import { ChevronRight, Plus, Star } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { RedeemSheet } from "./RedeemSheet";
import { RewardCard } from "./RewardCard";
import { RewardPersonChips } from "./RewardPersonChips";
import { RewardSheet } from "./RewardSheet";
import { StarBank } from "./StarBank";
import { StarHistorySheet } from "./StarHistorySheet";
import { ToggleSwitch } from "./ToggleSwitch";
import { setHideEarned, useHideEarned } from "@/lib/hideEarned";
import type { HouseholdPerson } from "@/lib/householdPeople";
import type { RewardView } from "@/lib/rewardsRead";
import { visibleRewards } from "@/lib/rewards/rewardRules";
import { REWARD_ADD_LABEL, REWARD_ALL_HIDDEN, REWARD_EMPTY_OTHER, REWARD_EMPTY_PARENT, REWARD_HIDE_EARNED_LABEL, addRewardForText, historyBankLabelText, historyLinkText } from "@/lib/rewardVocabulary";

// What the open redeem sheet was started with. It is kept as a copy: the page
// refreshes after a redeem (the reward is now earned, the bank lower), and the
// celebration must not vanish with it.
type RedeemTarget = { reward: RewardView; ownerName: string; bank: number };
type HistoryTarget = { userId: string; name: string };
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

  const [history, setHistory] = useState<HistoryTarget | null>(null);

  const closeSheet = () => setSheet(null);
  const closeRedeem = () => setRedeeming(null);
  const closeHistory = () => setHistory(null);
  const selectedPerson = people.find((person) => person.id === selectedId);

  return (
    <>
      <div className="mb-3 flex min-h-12 items-center justify-end gap-2">
        <span aria-hidden="true" className="text-sm font-medium text-muted">
          {REWARD_HIDE_EARNED_LABEL}
        </span>
        <ToggleSwitch checked={hideEarned} onChange={setHideEarned} label={REWARD_HIDE_EARNED_LABEL} />
      </div>

      <div className="@container">
        <div className="@min-[48rem]:hidden">
          <RewardPersonChips people={people} banks={banks} selectedId={selectedId} onSelect={setSelectedId} />
          {selectedPerson && (
            <button
              type="button"
              onClick={() => setHistory({ userId: selectedPerson.id, name: selectedPerson.displayName })}
              className="-mt-1 mb-2 flex min-h-12 items-center gap-1.5 text-sm font-bold text-accent active:opacity-70"
            >
              <Star aria-hidden="true" size={16} />
              {historyLinkText(selectedPerson.displayName)}
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 @min-[48rem]:grid-cols-none @min-[48rem]:grid-flow-col @min-[48rem]:auto-cols-[minmax(13.5rem,1fr)] @min-[48rem]:overflow-x-auto">
          {people.map((person) => {
            const bank = banks[person.id] ?? 0;
            const owned = rewards.filter((reward) => reward.ownerId === person.id);
            const shown = visibleRewards(owned, hideEarned);
            return (
              <section
                key={person.id}
                aria-label={person.displayName}
                className={`min-w-0 rounded-2xl @min-[48rem]:bg-surface-2/40 @min-[48rem]:p-3 ${person.id === selectedId ? "" : "hidden @min-[48rem]:block"}`}
              >
                <div className="mb-3 hidden items-center gap-3 @min-[48rem]:flex">
                  <AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} />
                  <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{person.displayName}</h2>
                  <button
                    type="button"
                    aria-label={historyBankLabelText(person.displayName, bank)}
                    onClick={() => setHistory({ userId: person.id, name: person.displayName })}
                    className="flex min-h-12 items-center gap-1 rounded-xl border border-line px-2 active:bg-surface-2"
                  >
                    <StarBank userId={person.id} stars={bank} />
                    <ChevronRight aria-hidden="true" size={16} className="text-muted" />
                  </button>
                </div>
                {shown.length === 0 && (
                  <p className="mb-3 text-sm text-muted">{owned.length > 0 ? REWARD_ALL_HIDDEN : canManage ? REWARD_EMPTY_PARENT : REWARD_EMPTY_OTHER}</p>
                )}
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
      {history && <StarHistorySheet key={history.userId} userId={history.userId} name={history.name} onClose={closeHistory} />}
      {redeeming && <RedeemSheet reward={redeeming.reward} ownerName={redeeming.ownerName} bank={redeeming.bank} onClose={closeRedeem} />}
    </>
  );
}
