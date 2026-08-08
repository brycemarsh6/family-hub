import { ChefHat } from "lucide-react";

/**
 * A photogenic placeholder for the recipe's hero photo — there's no image
 * storage yet (real photos are gated on the Vercel Blob decision, see the
 * Recipes v2 plan's C7 phase), so this stands in for one everywhere a
 * recipe is shown. Purely decorative; swap this out wholesale once C7 adds
 * real uploaded photos.
 */
export function RecipeHero() {
  return (
    <div className="mb-4 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-soft to-surface-2 md:h-52">
      <ChefHat aria-hidden="true" size={56} className="text-accent" />
    </div>
  );
}
