import { Star } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { rewardStatus } from "@/lib/rewards/rewardRules";
import type { RewardView } from "@/lib/rewardsRead";
import {
  REWARD_ASK_A_PARENT,
  REWARD_EARNED_LABEL,
  REWARD_NO_COST_LABEL,
  REWARD_NO_PICTURE_LABEL,
  REWARD_REDEEM_LABEL,
  REWARD_REPEATS_TAG,
  rewardProgressLabel,
  starCountText,
} from "@/lib/rewardVocabulary";

/**
 * One reward on a person's column: picture, title, and what is left to do.
 * Still saving: a bar and "55 of 150". Covered by the bank: Redeem (or "Ask a
 * parent" for someone who may not). Earned: the gold ring and the word. The
 * card body edits when `onEdit` is given (parents); Redeem is its own button.
 */
export function RewardCard({
  reward,
  bank,
  canRedeem,
  onEdit,
  onRedeem,
}: {
  reward: RewardView;
  bank: number;
  canRedeem: boolean;
  onEdit?: () => void;
  onRedeem: () => void;
}) {
  const status = rewardStatus(reward, bank);
  const earned = status.kind === "earned";

  const body = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-[1.75rem] leading-none">
        {reward.emoji ?? <span className="px-1 text-center text-xs leading-tight text-muted-strong">{REWARD_NO_PICTURE_LABEL}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="break-words text-base font-semibold text-fg">{reward.title}</span>
          {reward.repeatable && <span className="rounded-md border border-line px-1.5 text-xs font-bold text-muted">{REWARD_REPEATS_TAG}</span>}
        </span>
        {status.kind === "saving" && (
          <span className="mt-1.5 block">
            <ProgressBar fraction={status.fraction} label={rewardProgressLabel(reward.title)} />
            <span className="mt-1 block text-sm text-muted">{status.text}</span>
          </span>
        )}
        {status.kind === "ready" && reward.cost !== null && <span className="mt-0.5 block text-sm text-muted">{starCountText(reward.cost)}</span>}
        {status.kind === "wish" && <span className="mt-0.5 block text-sm text-muted">{REWARD_NO_COST_LABEL}</span>}
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
      className={`@container flex flex-wrap items-center gap-3 rounded-2xl p-3 ${earned ? "bg-star-soft ring-2 ring-star" : "border border-line bg-surface"}`}
    >
      {onEdit ? (
        <button type="button" onClick={onEdit} className="flex min-h-12 min-w-0 flex-1 basis-0 items-center gap-3 text-left">
          {body}
        </button>
      ) : (
        <div className="flex min-h-12 min-w-0 flex-1 basis-0 items-center gap-3">{body}</div>
      )}
      {status.kind === "ready" &&
        (canRedeem ? (
          <button
            type="button"
            onClick={onRedeem}
            className="min-h-12 shrink-0 rounded-xl bg-accent px-4 @max-[18rem]:w-full text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
          >
            {REWARD_REDEEM_LABEL}
          </button>
        ) : (
          <span className="shrink-0 text-sm italic text-muted @max-[18rem]:w-full">{REWARD_ASK_A_PARENT}</span>
        ))}
    </li>
  );
}
