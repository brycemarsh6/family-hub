import { ChefHat } from "lucide-react";

/**
 * A photogenic placeholder for the recipe's hero photo. C7 (real photos) was
 * dropped, so the block is the permanent phone treatment, and the detail page
 * is its one user. From `md` it gives way to a small icon tile beside the
 * title (decision 216). Purely decorative.
 *
 * Both looks render and CSS picks one: the big block on
 * phones, the tile from `md` up. This is a
 * screen breakpoint, not a container variant, on purpose: the hero sits in
 * the page's header band, which also holds the action sheets, so the band
 * cannot be a container. `md` is exactly where AppChrome lifts the page's
 * width cap, so "wide" means the same thing to both.
 */
export function RecipeHero() {
  return (
    <>
      <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-accent-soft to-surface-2 md:hidden">
        <ChefHat aria-hidden="true" size={56} className="text-accent" />
      </div>
      <div
        aria-hidden="true"
        className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent md:flex"
      >
        <ChefHat size={30} />
      </div>
    </>
  );
}
