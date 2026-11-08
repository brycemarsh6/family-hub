"use client";

import { Plus } from "lucide-react";

/**
 * The Recipes page's "+" (it replaced the old header New button).
 *
 * On phones and ordinary pages it sits at the bottom-LEFT of the content
 * column, on purpose: the A-Z jump rail (RecipeList) owns the right edge at
 * full height, so a bottom-right button would sit right on top of X/Y/Z.
 *
 * On a wide page (anything with `data-page-width="wide"`, from `md` up) it
 * moves to the bottom-RIGHT of the content area, because the iPad landscape
 * plan (rule 4 in .avengers/plans/ipad-landscape-v1.md) puts the add button
 * there. The Recipes rail then stops above the button (RecipeList raises its
 * own bottom edge with the same selector), so they never overlap.
 *
 * It lines up with the content column's edge, not the raw viewport edge: the
 * page is centered in a max-w-3xl column with margin around it, and pinning
 * to the viewport would strand the button out in that margin. When the pinned
 * menu is on, `--app-nav-width` (set by AppChrome) moves the left edge past
 * it; unset, it is 0.
 */
export function FloatingAddButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="pointer-events-none fixed right-0 left-[var(--app-nav-width,0px)] z-40 flex justify-center"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex w-full max-w-3xl px-4 md:[body:has([data-page-width=wide])_&]:max-w-none md:[body:has([data-page-width=wide])_&]:justify-end">
        <button
          type="button"
          onClick={onClick}
          aria-label="Add"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition-opacity active:opacity-80"
        >
          <Plus aria-hidden="true" size={26} />
        </button>
      </div>
    </div>
  );
}
