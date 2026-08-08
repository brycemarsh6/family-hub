"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ComingSoonSheet } from "./ComingSoonSheet";

/**
 * A real, tappable placeholder — not just decorative text — per the house's
 * no-feature-stubbed-early rule and the plan's own "placeholder button"
 * wording. The real Haiku-estimated nutrition call lands in C6.
 */
export function NutritionPlaceholder() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-6 border-t border-line pt-4">
      <h2 className="mb-2 text-lg font-semibold">Nutrition</h2>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-medium text-muted transition-colors active:bg-surface-2"
      >
        <Sparkles aria-hidden="true" size={16} />
        Calculate nutrition
      </button>

      {open && (
        <ComingSoonSheet
          title="Nutrition"
          message="Estimating calories and macros for this recipe is coming soon."
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}
