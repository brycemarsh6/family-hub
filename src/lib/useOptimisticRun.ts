"use client";

import { useState, useTransition } from "react";

/** What the user sees when the call never reached the server (network down). */
export const SAVE_FAILED = "Couldn't save that. Check your connection and try again.";

/**
 * The one "tap now, confirm later" wrapper. Pass the `useOptimistic` setter;
 * `run(change, action)` clears the error, starts a transition, shows the
 * change at once, awaits the action, puts `result.error` under the control,
 * and turns a thrown network failure into SAVE_FAILED instead of the error
 * page. The action is a closure so this file never imports from `app/`.
 *
 * `change` may be null when there is nothing to show yet (VisionBoard's empty
 * save). `onSuccess` runs only when the action came back without an error.
 * `startTransition` and `setError` are returned for the few writes that are
 * deliberately not optimistic (GoalDetail's deletes) or clear the line by hand.
 */
export function useOptimisticRun<Change>(applyOptimistic: (change: Change) => void) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(change: Change | null, action: () => Promise<{ error?: string }>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      if (change !== null) applyOptimistic(change);
      try {
        const result = await action();
        if (result.error) setError(result.error);
        else onSuccess?.();
      } catch {
        // The call never reached the server (network down): say so here instead of the error page.
        setError(SAVE_FAILED);
      }
    });
  }

  return { run, error, setError, pending, startTransition };
}
