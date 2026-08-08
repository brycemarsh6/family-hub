"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { setRecipeRating } from "@/app/actions/recipes";

/**
 * 1-5 star rating, one tap. Tapping the star that's already the current
 * rating clears it back to unrated, rather than needing a separate clear
 * control — per the Recipes v2 plan's decision. Optimistic, same pattern as
 * every other in-page control in this app.
 */
export function RecipeStars({
  recipeId,
  initialRating,
}: {
  recipeId: string;
  initialRating: number | null;
}) {
  const [rating, setRating] = useState(initialRating);
  const [, startTransition] = useTransition();

  function handleTap(value: number) {
    const next = rating === value ? null : value;
    setRating(next);
    startTransition(async () => {
      await setRecipeRating(recipeId, next);
    });
  }

  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = rating !== null && value <= rating;
        return (
          <button
            key={value}
            type="button"
            onClick={() => handleTap(value)}
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors active:bg-surface-2"
          >
            <Star
              aria-hidden="true"
              size={22}
              className={filled ? "fill-warn text-warn" : "text-line"}
            />
          </button>
        );
      })}
    </div>
  );
}
