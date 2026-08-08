import { Clock, Users, ExternalLink } from "lucide-react";

export type RecipeMetaData = {
  servings: string | null;
  prepTime: string | null;
  cookTime: string | null;
  sourceUrl: string | null;
};

/**
 * The servings/prep/cook row and the source link — split out of RecipeBody
 * so the private detail page (Recipes v2's C3 redesign) can place it near
 * the top, ahead of the cookbook/rating/cooked controls, while ingredients
 * and steps stay further down. The public share page renders this in the
 * same spot RecipeBody used to put it, so nothing moved for that reader.
 */
export function RecipeMeta({ recipe }: { recipe: RecipeMetaData }) {
  const meta = [
    recipe.servings && { icon: Users, label: recipe.servings },
    recipe.prepTime && { icon: Clock, label: `Prep ${recipe.prepTime}` },
    recipe.cookTime && { icon: Clock, label: `Cook ${recipe.cookTime}` },
  ].filter(Boolean) as { icon: typeof Users; label: string }[];

  if (meta.length === 0 && !recipe.sourceUrl) return null;

  return (
    <>
      {meta.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {meta.map(({ icon: Icon, label }, index) => (
            <span key={index} className="flex items-center gap-1.5">
              <Icon aria-hidden="true" size={16} />
              {label}
            </span>
          ))}
        </div>
      )}

      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex items-center gap-1.5 text-sm text-accent underline underline-offset-2"
        >
          <ExternalLink aria-hidden="true" size={14} />
          Source
        </a>
      )}
    </>
  );
}
