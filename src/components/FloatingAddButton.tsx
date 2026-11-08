"use client";

import Link from "next/link";
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
 * the button stranded out in that margin on a desktop-width window. When the
 * pinned menu is on, `--app-nav-width` (set by AppChrome) moves the left edge
 * past it; unset, it is 0.
 *
 * A page that carries `data-page-width="wide"` (Habits & Chores) has no
 * narrow column, so there the button lifts the cap from `md` and sits at the
 * bottom RIGHT, past the content. It is a button (`onClick`) or a link
 * (`href`); `label` is what a screen reader says.
 */
export function FloatingAddButton({ onClick, href, label = "Add" }: { onClick?: () => void; href?: string; label?: string }) {
  const className =
    "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition-opacity active:opacity-80";
  return (
    <div
      className="pointer-events-none fixed right-0 left-[var(--app-nav-width,0px)] z-40 flex justify-center"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex w-full max-w-3xl px-4 md:[body:has([data-page-width=wide])_&]:max-w-none [body:has([data-page-width=wide])_&]:justify-end">
        {href ? (
          <Link href={href} aria-label={label} className={className}>
            <Plus aria-hidden="true" size={26} />
          </Link>
        ) : (
          <button type="button" onClick={onClick} aria-label={label} className={className}>
            <Plus aria-hidden="true" size={26} />
          </button>
        )}
      </div>
    </div>
  );
}
