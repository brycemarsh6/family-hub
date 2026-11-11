"use client";

import { useState, useTransition } from "react";

/** What the user sees when the call never reached the server (network down). */
export const SAVE_FAILED = "Couldn't save that. Check your connection and try again.";

/**
 * The await half of `run`, without React: awaits the action, then calls
 * `onSuccess`, or `fail` with `result.error` or, when the call never reached
 * the server (network down), SAVE_FAILED instead of the error page.
 * Exported for useOptimisticRun.test.ts; callers use `run`.
 */
export async function settleAction(
  action: () => Promise<{ error?: string }>,
  fail: (message: string) => void,
  onSuccess?: () => void,
): Promise<void> {
  try {
    const result = await action();
    if (result.error) fail(result.error);
    else onSuccess?.();
  } catch {
    // The call never reached the server (network down): say so here instead of the error page.
    fail(SAVE_FAILED);
  }
}

/**
 * The one "tap now, confirm later" wrapper. Pass the `useOptimistic` setter;
 * `run(change, action)` clears the error, starts a transition, shows the
 * change at once, awaits the action, puts `result.error` under the control,
 * and turns a thrown network failure into SAVE_FAILED instead of the error
 * page. The action is a closure so this file never imports from `app/`.
 *
 * `change` may be null when there is nothing to show yet (VisionBoard's empty
 * save). `onSuccess` runs only when the action came back without an error;
 * `onError` runs with the line just shown (the server's reason, or
 * SAVE_FAILED), still inside the transition, for a caller that must also
 * undo something of its own (useEventMoves's glide back and warn bar).
 * `startTransition` and `setError` are returned for the few writes that are
 * deliberately not optimistic (GoalDetail's deletes) or clear the line by hand.
 */
export function useOptimisticRun<Change>(applyOptimistic: (change: Change) => void) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(
    change: Change | null,
    action: () => Promise<{ error?: string }>,
    onSuccess?: () => void,
    onError?: (message: string) => void,
  ) {
    setError(null);
    startTransition(async () => {
      if (change !== null) applyOptimistic(change);
      await settleAction(
        action,
        (message) => {
          setError(message);
          onError?.(message);
        },
        onSuccess,
      );
    });
  }

  return { run, error, setError, pending, startTransition };
}
