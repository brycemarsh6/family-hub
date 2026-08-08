"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2, Plus } from "lucide-react";
import { BackLink } from "@/components/BackLink";
import { RecipeList, type RecipeListItem } from "@/components/RecipeList";
import { ActionSheet } from "@/components/ActionSheet";
import { TitleSheet } from "@/components/TitleSheet";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { AddRecipeToCookbookSheet } from "@/components/AddRecipeToCookbookSheet";
import {
  renameCookbook,
  deleteCookbook,
  removeRecipeFromCookbook,
} from "@/app/actions/cookbooks";

/**
 * A cookbook's own page — title, count, its recipes as the familiar list
 * (RecipeList, reused wholesale, with the swipe-to-unfile action wired on),
 * and the ⋯ menu for renaming or deleting the book. Local state mirrors the
 * server (rather than router.refresh()) so add/remove/rename feel instant,
 * same pattern ShareRecipeControls already established for this kind of
 * plain-async Server Action.
 */
export function CookbookDetail({
  cookbookId,
  initialTitle,
  initialRecipes,
  allRecipes,
}: {
  cookbookId: string;
  initialTitle: string;
  initialRecipes: RecipeListItem[];
  allRecipes: RecipeListItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRename(newTitle: string) {
    setError(null);
    startTransition(async () => {
      const result = await renameCookbook(cookbookId, newTitle);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTitle(newTitle.trim());
      setRenameOpen(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteCookbook(cookbookId);
      router.push("/kitchen/cooking/recipes");
    });
  }

  function handleUnfile(recipeId: string) {
    // Optimistic: the recipe disappears from this book's list immediately,
    // same as everywhere else in the app that doesn't wait on a round trip
    // for a tap to register.
    setRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeId));
    startTransition(async () => {
      await removeRecipeFromCookbook(cookbookId, recipeId);
    });
  }

  function handleAdded(recipe: RecipeListItem) {
    setRecipes((prev) => [...prev, recipe]);
  }

  const candidateRecipes = allRecipes.filter(
    (recipe) => !recipes.some((r) => r.id === recipe.id),
  );

  return (
    <div className="py-2">
      <BackLink href="/kitchen/cooking/recipes" label="Recipes" />

      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Cookbook actions"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface transition-colors active:bg-surface-2"
        >
          <MoreVertical aria-hidden="true" size={20} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="mb-4 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
      >
        <Plus aria-hidden="true" size={20} />
        Add recipe
      </button>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
        >
          {error}
        </p>
      )}

      <RecipeList
        recipes={recipes}
        onRemove={handleUnfile}
        emptyHint="Tap Add recipe above to file one here."
      />

      {menuOpen && (
        <ActionSheet
          title={title}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Edit title",
              icon: <Pencil aria-hidden="true" size={18} />,
              onClick: () => {
                setMenuOpen(false);
                setRenameOpen(true);
              },
            },
            {
              label: "Delete cookbook",
              icon: <Trash2 aria-hidden="true" size={18} />,
              destructive: true,
              onClick: () => {
                setMenuOpen(false);
                setDeleteConfirmOpen(true);
              },
            },
          ]}
        />
      )}

      {renameOpen && (
        <TitleSheet
          heading="Edit title"
          initialValue={title}
          submitLabel="Save"
          pending={pending}
          error={error}
          onSubmit={handleRename}
          onClose={() => setRenameOpen(false)}
        />
      )}

      {deleteConfirmOpen && (
        <ConfirmSheet
          title={`Delete ${title}?`}
          message={
            recipes.length === 0
              ? "This cookbook is empty."
              : `Its ${recipes.length} ${
                  recipes.length === 1 ? "recipe stays" : "recipes stay"
                } in All Recipes.`
          }
          confirmLabel="Delete cookbook"
          pending={pending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}

      {addOpen && (
        <AddRecipeToCookbookSheet
          cookbookId={cookbookId}
          candidates={candidateRecipes}
          onAdded={handleAdded}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
