"use client";

import { Plus } from "lucide-react";

/**
 * The Recipes page's "+" — replaces the old header New button. Pinned to
 * the bottom-LEFT corner, deliberately: the A-Z jump rail (RecipeList) owns
 * the right edge at full height, so a bottom-right button would sit right on
 * top of X/Y/Z.
 *
 * Aligned to the content column's own left edge, not the raw viewport edge —
 * the app's page content is centered in a max-w-3xl column with margin
 * around it on wide screens, and pinning to the viewport edge would leave
 * the button stranded out in that margin on a desktop-width window.
 */
export function FloatingAddButton({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center"
      style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="w-full max-w-3xl px-4">
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
