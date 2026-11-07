// DB row -> wire format for the Assistant API's cookbook routes. Pure, and
// every output is built field by field: never a spread of a row, so a column
// added later can't leak onto the wire by default.

export type CookbookListRow = {
  id: string;
  title: string;
  shareToken: string | null;
  _count: { recipes: number };
};

export type CookbookDetailRow = CookbookListRow & {
  recipes: { addedAt: Date; recipe: { id: string; title: string } }[];
};

/** The list shape; also what create, rename and the other writes answer with. */
export function toCookbook(row: CookbookListRow) {
  return {
    id: row.id,
    title: row.title,
    recipeCount: row._count.recipes,
    shared: row.shareToken !== null,
  };
}

/** The public page address for a cookbook's share token, from the request's own origin. */
export function toCookbookShareUrl(origin: string, token: string | null): string | null {
  return token ? `${origin}/share/cookbook/${token}` : null;
}

/** One cookbook with its recipes, newest filing first. */
export function toCookbookDetail(row: CookbookDetailRow, origin: string, createdByAssistant: boolean) {
  const recipes = [...row.recipes].sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  return {
    ...toCookbook(row),
    shareUrl: toCookbookShareUrl(origin, row.shareToken),
    createdByAssistant,
    recipes: recipes.map((r) => ({
      id: r.recipe.id,
      title: r.recipe.title,
      addedAt: r.addedAt.toISOString(),
    })),
  };
}
