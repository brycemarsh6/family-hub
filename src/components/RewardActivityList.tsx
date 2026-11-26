"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { undoRedeem } from "@/app/actions/rewards";
import { undoStarAdjustment } from "@/app/actions/starAdjustments";
import type { RecentLine } from "@/lib/rewards/starHistory";
import { NO_RECENT_TEXT, RECENT_UNDO_LABEL } from "@/lib/rewardVocabulary";

/**
 * Manage's Recent list: redemptions and bonus or taken stars from the last 30
 * days, each with a one-tap Undo (no confirmation). The row leaves at once and
 * comes back with a message if the undo fails. R3's undo does not refresh
 * this page, so it refreshes itself after a success.
 */
export function RewardActivityList({ lines }: { lines: RecentLine[] }) {
  const router = useRouter();
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const keyOf = (line: RecentLine) => `${line.kind}-${line.id}`;
  const shown = lines.filter((line) => !gone.has(keyOf(line)));

  function handleUndo(line: RecentLine) {
    const key = keyOf(line);
    setError(null);
    setGone((current) => new Set(current).add(key));
    startTransition(async () => {
      const result = line.kind === "redeem" ? await undoRedeem(line.id) : await undoStarAdjustment(line.id);
      if (result.error) {
        setGone((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
        return setError(result.error);
      }
      router.refresh();
    });
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
                {line.kind === "redeem" ? (line.emoji ?? <Star aria-hidden="true" size={18} className="text-muted" />) : <Star aria-hidden="true" size={18} className="text-muted" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{line.title}</p>
                <p className="text-xs text-muted">{line.sub}</p>
              </div>
              <button
                type="button"
                onClick={() => handleUndo(line)}
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
