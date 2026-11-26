"use client";

import { useEffect, useState } from "react";
import { getStarHistory } from "@/app/actions/starHistory";
import type { HistoryDay } from "@/lib/rewards/starHistory";
import { HISTORY_EMPTY, HISTORY_FAILED, HISTORY_FOOTER, HISTORY_LOADING, REWARD_DONE_LABEL, historyTitleText, starCountText } from "@/lib/rewardVocabulary";

type Loaded = { name: string; bank: number; days: HistoryDay[] };

/**
 * One person's last 30 days of stars, grouped by day, newest first. It asks
 * the server when it opens. The bank is shown as words, not a StarBank, so the
 * page keeps exactly one star bank per person. Any login may open anyone's.
 */
export function StarHistorySheet({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    getStarHistory(userId)
      .then((result) => {
        if (!current) return;
        if ("error" in result) setError(result.error);
        else setLoaded(result);
      })
      .catch(() => current && setError(HISTORY_FAILED));
    return () => {
      current = false;
    };
  }, [userId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const heading = historyTitleText(loaded?.name ?? name);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="relative flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="min-w-0 truncate text-lg font-semibold">{heading}</h2>
          {loaded && <span className="shrink-0 text-base font-bold tabular-nums">{starCountText(loaded.bank)}</span>}
        </div>

        <div className="min-h-24 flex-1 overflow-y-auto">
          {error ? (
            <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
              {error}
            </p>
          ) : !loaded ? (
            <p className="text-sm text-muted">{HISTORY_LOADING}</p>
          ) : loaded.days.length === 0 ? (
            <p className="text-sm text-muted">{HISTORY_EMPTY}</p>
          ) : (
            loaded.days.map((day) => (
              <section key={day.dayKey} aria-label={day.label}>
                <h3 className="mb-1 mt-3 text-xs font-extrabold uppercase tracking-wide text-muted">{day.label}</h3>
                <ul>
                  {day.lines.map((line) => (
                    <li key={`${line.kind}-${line.id}`} className="flex min-h-12 items-center gap-3 border-t border-line py-2 first:border-t-0">
                      {line.emoji && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl leading-none">{line.emoji}</span>}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{line.text}</p>
                        {line.sub && <p className="text-xs text-muted">{line.sub}</p>}
                      </div>
                      <span className={`shrink-0 text-base font-extrabold tabular-nums ${line.tone === "minus" ? "text-danger" : "text-accent"}`}>{line.amountText}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {loaded && <p className="mt-3 text-sm text-muted">{HISTORY_FOOTER}</p>}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 min-h-12 w-full rounded-xl border border-line text-base font-semibold text-fg transition-colors active:bg-surface-2"
        >
          {REWARD_DONE_LABEL}
        </button>
      </div>
    </div>
  );
}
