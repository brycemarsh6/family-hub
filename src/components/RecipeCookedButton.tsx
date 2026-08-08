"use client";

import { useState, useTransition } from "react";
import { CookingPot } from "lucide-react";
import { markRecipeCooked } from "@/app/actions/recipes";
import { useToday } from "@/lib/useToday";
import { daysUntil } from "@/lib/expiring";

/**
 * Stamps lastCookedAt to now — always overwrites, never toggles off, since
 * the point is a running record of the most recent time this was made (see
 * the schema comment on Recipe.lastCookedAt for why this is a timestamp and
 * not a boolean).
 *
 * The "N days ago" label reads the device's own clock via useToday(), the
 * same pattern the Meal Plan branch established — a day-difference computed
 * from the server's clock could disagree with the browser's by most of a
 * day (Vercel runs UTC; this household is on Mountain time), which would
 * show as a wrong number briefly flipping to the right one after hydration.
 * useToday() returns null until the browser's real "today" is known, so the
 * label just doesn't render for that first instant rather than guessing.
 */
export function RecipeCookedButton({
  recipeId,
  initialLastCookedAt,
}: {
  recipeId: string;
  initialLastCookedAt: Date | null;
}) {
  const [lastCookedAt, setLastCookedAt] = useState(initialLastCookedAt);
  const [pending, startTransition] = useTransition();
  const today = useToday();

  function handleTap() {
    const now = new Date();
    setLastCookedAt(now);
    startTransition(async () => {
      await markRecipeCooked(recipeId);
    });
  }

  const label = today && lastCookedAt ? cookedLabel(lastCookedAt, today) : null;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleTap}
        disabled={pending}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-fg transition-colors active:bg-surface-2 disabled:opacity-50"
      >
        <CookingPot aria-hidden="true" size={18} />
        Mark as cooked
      </button>
      {label && <span className="text-sm text-muted">{label}</span>}
    </div>
  );
}

function cookedLabel(lastCookedAt: Date, today: Date): string {
  const days = daysUntil(today, lastCookedAt);
  if (days <= 0) return "Cooked today";
  if (days === 1) return "Cooked yesterday";
  return `Cooked ${days} days ago`;
}
