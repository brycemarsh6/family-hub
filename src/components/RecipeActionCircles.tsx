"use client";

import { useState } from "react";
import { CalendarDays, ShoppingCart, Share2 } from "lucide-react";
import { ShareSheet } from "./ShareSheet";
import { ComingSoonSheet } from "./ComingSoonSheet";

/**
 * The three quick-action circles under the recipe title: Meal Plan, Add to
 * groceries, and Share. Meal Plan and Groceries are visible now but not
 * wired up — real logic lands in C5 (cross-branch buttons) — per the house's
 * no-feature-stubbed-early rule; tapping either gives a real acknowledgment
 * (ComingSoonSheet) rather than doing nothing. Share is real today, reusing
 * everything R4 already built — it just moved from its own standing section
 * into this sheet, opened from here.
 */
export function RecipeActionCircles({
  recipeId,
  title,
  ingredients,
  steps,
  initialShareToken,
}: {
  recipeId: string;
  title: string;
  ingredients: string;
  steps: string;
  initialShareToken: string | null;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [comingSoon, setComingSoon] = useState<{ title: string; message: string } | null>(
    null,
  );

  return (
    <div className="mb-6 flex items-center justify-around">
      <ActionCircle
        icon={<CalendarDays aria-hidden="true" size={22} />}
        label="Meal Plan"
        onClick={() =>
          setComingSoon({
            title: "Meal Plan",
            message: "Adding this recipe straight to a meal-plan slot is coming soon.",
          })
        }
      />
      <ActionCircle
        icon={<ShoppingCart aria-hidden="true" size={22} />}
        label="Groceries"
        onClick={() =>
          setComingSoon({
            title: "Add to groceries",
            message:
              "Adding this recipe's ingredients to your shopping list is coming soon.",
          })
        }
      />
      <ActionCircle
        icon={<Share2 aria-hidden="true" size={22} />}
        label="Share"
        onClick={() => setShareOpen(true)}
      />

      {shareOpen && (
        <ShareSheet
          recipeId={recipeId}
          title={title}
          ingredients={ingredients}
          steps={steps}
          initialShareToken={initialShareToken}
          onClose={() => setShareOpen(false)}
        />
      )}

      {comingSoon && (
        <ComingSoonSheet
          title={comingSoon.title}
          message={comingSoon.message}
          onClose={() => setComingSoon(null)}
        />
      )}
    </div>
  );
}

function ActionCircle({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-fg transition-colors active:bg-line">
        {icon}
      </span>
      <span className="text-xs font-medium text-muted">{label}</span>
    </button>
  );
}
