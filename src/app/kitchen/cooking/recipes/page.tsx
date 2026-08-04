import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

// Flat and alphabetized for now — R2 of the Recipes plan (CLAUDE.md) adds the
// A-Z jump rail and search on top of this same list. Sorted in JS rather than
// via Prisma's orderBy, same reasoning as PantryList: localeCompare avoids any
// surprise from the database's collation.
export default async function RecipesPage() {
  const recipes = await db.recipe.findMany({
    select: { id: true, title: true },
  });
  const sorted = [...recipes].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="py-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Recipes
          </h1>
          <p className="mt-1 text-sm text-muted">
            {sorted.length} {sorted.length === 1 ? "recipe" : "recipes"}
          </p>
        </div>
        <Link
          href="/kitchen/cooking/recipes/new"
          className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
        >
          <Plus aria-hidden="true" size={20} />
          New
        </Link>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          emoji="📖"
          title="No recipes yet"
          hint="Add the household's first recipe with the New button above."
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/kitchen/cooking/recipes/${recipe.id}`}
                className="flex min-h-14 items-center rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
              >
                {recipe.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
