import { Star } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { rewardStatus } from "@/lib/rewards/rewardRules";
import type { Gate } from "@/lib/rewardGates";
import type { RewardView } from "@/lib/rewardsRead";
import {
  REWARD_EARNED_LABEL,
  REWARD_NO_COST_LABEL,
  REWARD_NO_PICTURE_LABEL,
  REWARD_REDEEM_LABEL,
  REWARD_REPEATS_TAG,
  WISH_KID_WAITING,
  WISH_SET_COST_LABEL,
  WISH_TAG,
  rewardProgressLabel,
  rewardRedeemAriaLabel,
  starCountText,
} from "@/lib/rewardVocabulary";

const TAG = "rounded-md border border-line px-1.5 text-xs font-bold text-muted";
const ACTION = "min-h-12 shrink-0 rounded-xl bg-accent px-4 @max-[18rem]:w-full text-base font-semibold text-accent-fg transition-opacity active:opacity-80";

/**
 * One reward on a person's column: picture, title, and what is left to do.
 * Still saving: a bar and "55 of 150". Covered by the bank: Redeem, unless the
 * owner's redeem gate is `no` (then nothing). A wish (no cost yet): a dashed
 * card, a Wish tag, and a Set cost button for whoever may set it, else the
 * waiting words. Earned: the gold ring and the word. The card body opens its
 * sheet when `onEdit` is given; Redeem and Set cost are their own buttons. The
 * card reads the gate it is handed and never tests a role itself.
 */
export function RewardCard({
  reward,
  bank,
  redeem,
  canSetCost,
  onEdit,
  onRedeem,
  onSetCost,
}: {
  reward: RewardView;
  bank: number;
  redeem: Gate;
  canSetCost: boolean;
  onEdit?: () => void;
  onRedeem: () => void;
  onSetCost: () => void;
}) {
  const status = rewardStatus(reward, bank);
  const earned = status.kind === "earned";
  const wish = status.kind === "wish";

  const body = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-[1.75rem] leading-none">
        {reward.emoji ?? <span className="px-1 text-center text-xs leading-tight text-muted-strong">{REWARD_NO_PICTURE_LABEL}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="break-words text-base font-semibold text-fg">{reward.title}</span>
          {reward.repeatable && <span className={TAG}>{REWARD_REPEATS_TAG}</span>}
          {wish && <span className={TAG}>{WISH_TAG}</span>}
        </span>
        {status.kind === "saving" && (
          <span className="mt-1.5 block">
            <ProgressBar fraction={status.fraction} label={rewardProgressLabel(reward.title)} />
            <span className="mt-1 block text-sm text-muted">{status.text}</span>
          </span>
        )}
        {status.kind === "ready" && typeof reward.cost === "number" && <span className="mt-0.5 block text-sm text-muted">{starCountText(reward.cost)}</span>}
        {wish && <span className="mt-0.5 block text-sm text-muted">{canSetCost ? REWARD_NO_COST_LABEL : WISH_KID_WAITING}</span>}
        {earned && (
          <span className="mt-0.5 flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-fg">
            <Star aria-hidden="true" size={14} fill="currentColor" className="text-star" />
            {REWARD_EARNED_LABEL}
          </span>
        )}
      </span>
    </>
  );

  return (
    <li
      className={`@container flex flex-wrap items-center gap-3 rounded-2xl p-3 ${earned ? "bg-star-soft ring-2 ring-star" : wish ? "border border-dashed border-line-strong bg-surface" : "border border-line bg-surface"}`}
    >
      {onEdit ? (
        <button type="button" onClick={onEdit} className="flex min-h-12 min-w-0 flex-1 basis-0 items-center gap-3 text-left">
          {body}
        </button>
      ) : (
        <div className="flex min-h-12 min-w-0 flex-1 basis-0 items-center gap-3">{body}</div>
      )}
      {status.kind === "ready" && redeem !== "no" && (
        <button type="button" onClick={onRedeem} aria-label={rewardRedeemAriaLabel(reward.title)} className={ACTION}>
          {REWARD_REDEEM_LABEL}
        </button>
      )}
      {wish && canSetCost && (
        <button type="button" onClick={onSetCost} className={ACTION}>
          {WISH_SET_COST_LABEL}
        </button>
      )}
    </li>
  );
}
