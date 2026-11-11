"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * The Recipes page's "+" (it replaced the old header New button).
 *
 * On phones and ordinary pages it sits at the bottom-LEFT of the content
 * column, on purpose: the A-Z jump rail (RecipeList) owns the right edge at
 * full height, and a habit row's check sits at the right, so a bottom-right
 * button would cover them.
 *
 * On a wide page (anything with `data-page-width="wide"`, from `md` up) it
 * lifts the cap and moves to the bottom-RIGHT of the content area (rule 4 in
 * .avengers/plans/ipad-landscape-v1.md). The Recipes rail then stops above
 * the button (RecipeLetterRail raises its own bottom edge with the same
 * selector), so they never overlap.
 *
 * It lines up with the content column's edge, not the raw viewport edge: the
 * page is centered in a max-w-3xl column with margin around it, and pinning
 * to the viewport would strand the button out in that margin. When the pinned
 * menu is on, `--app-nav-width` (set by AppChrome) moves the left edge past
 * it; unset, it is 0.
 *
 * `placement="right"` skips all of that: the button sits bottom-RIGHT at every
 * width, on the viewport's right edge (the full-screen Calendar, which has no
 * column margin and no rail to avoid).
 *
 * It is a button (`onClick`) or a link (`href`); `label` is what a screen
 * reader says.
 */
export function FloatingAddButton({
  onClick,
  href,
  label = "Add",
  placement = "auto",
}: {
  onClick?: () => void;
  href?: string;
  label?: string;
  placement?: "auto" | "right";
}) {
  const className =
    "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition-opacity active:opacity-80";
  return (
    <div
      className="pointer-events-none fixed right-0 left-[var(--app-nav-width,0px)] z-40 flex justify-center"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <div
        className={
          placement === "right"
            ? "flex w-full justify-end px-4"
            : "flex w-full max-w-3xl px-4 md:[body:has([data-page-width=wide])_&]:max-w-none md:[body:has([data-page-width=wide])_&]:justify-end"
        }
      >
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
