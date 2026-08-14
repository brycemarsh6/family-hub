"use client";

import { useState, useTransition } from "react";
import { PutAwayReviewSheet } from "./PutAwayReviewSheet";
import {
  classifyForPutAway,
  commitPutAway,
  type PutAwayClassification,
  type PutAwayDecision,
} from "@/app/actions/groceriesPutAway";

/**
 * Replaces a plain `<form action={putAwayCheckedItems}>` because put-away
 * now needs a decision before it can act: classify first, and only open
 * the review sheet if something checked off isn't already in the
 * inventory. A fully-known shop — everything linked or an exact name
 * match — commits immediately with no sheet at all, exactly like the old
 * one-click form did. That's Bryce's explicit ask: no prompt when the app
 * already knows what something is.
 */
export function PutAwayButton({ checkedCount }: { checkedCount: number }) {
  const [pending, startTransition] = useTransition();
  const [review, setReview] = useState<PutAwayClassification | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const classification = await classifyForPutAway();
      if (classification.newItems.length === 0) {
        const result = await commitPutAway([]);
        if (result.error) setError(result.error);
      } else {
        setReview(classification);
      }
    });
  }

  function handleSubmitReview(decisions: PutAwayDecision[]) {
    startTransition(async () => {
      const result = await commitPutAway(decisions);
      if (result.error) {
        setError(result.error);
      } else {
        setReview(null);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-60"
      >
        <span aria-hidden="true">📦</span> Put away {checkedCount} into the
        inventory
      </button>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {review && (
        <PutAwayReviewSheet
          newItems={review.newItems}
          submitting={pending}
          onCancel={() => setReview(null)}
          onSubmit={handleSubmitReview}
        />
      )}
    </>
  );
}
