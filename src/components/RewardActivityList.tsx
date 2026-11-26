"use client";

import { useOptimistic, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Star } from "lucide-react";
import { undoRedeem } from "@/app/actions/rewards";
import { undoStarAdjustment } from "@/app/actions/starAdjustments";
import type { RecentLine } from "@/lib/rewards/starHistory";
import { NO_RECENT_TEXT, RECENT_UNDO_LABEL, recentUndoLabelText } from "@/lib/rewardVocabulary";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

/**
 * Manage's Recent list: redemptions and bonus or taken stars from the last 30
 * days, each with a one-tap Undo (no confirmation). The row leaves at once and
 * comes back with a message if the undo fails (useOptimistic drops the hide;
 * `gone` keeps it hidden after a success until the refreshed lines arrive). R3's undo does not refresh
 * this page, so it refreshes itself after a success.
 */
export function RewardActivityList({ lines }: { lines: RecentLine[] }) {
  const router = useRouter();
  const keyOf = (line: RecentLine) => `${line.kind}-${line.id}`;
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [optimisticLines, hide] = useOptimistic<RecentLine[], string>(lines, (list, key) => list.filter((line) => keyOf(line) !== key));
  const { run, error } = useOptimisticRun<string>(hide);
  const shown = optimisticLines.filter((line) => !gone.has(keyOf(line)));

  function handleUndo(line: RecentLine) {
    run(
      keyOf(line),
      () => (line.kind === "redeem" ? undoRedeem(line.id) : undoStarAdjustment(line.id)),
      () => {
        setGone((current) => new Set(current).add(keyOf(line)));
        router.refresh();
      },
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-2 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          {error}
        </p>
      )}
      {shown.length === 0 ? (
        <p className="text-sm text-muted">{NO_RECENT_TEXT}</p>
      ) : (
        <ul className="rounded-2xl border border-line bg-surface px-3">
          {shown.map((line) => (
            <li key={keyOf(line)} className="flex min-h-14 items-center gap-3 border-t border-line py-2 first:border-t-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl leading-none">
                {line.kind === "redeem" ? (line.emoji ?? <Gift aria-hidden="true" size={18} className="text-muted" />) : <Star aria-hidden="true" size={18} className="text-muted" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{line.title}</p>
                <p className="text-xs text-muted">{line.sub}</p>
              </div>
              <button
                type="button"
                onClick={() => handleUndo(line)}
                aria-label={recentUndoLabelText(line.title)}
                className="flex min-h-12 shrink-0 items-center rounded-xl border border-line px-3 text-sm font-bold text-fg transition-colors active:bg-surface-2"
              >
                {RECENT_UNDO_LABEL}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
