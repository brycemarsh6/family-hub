"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, BookOpen, LibraryBig } from "lucide-react";
import { RecipeList, type RecipeListItem } from "./RecipeList";
import { CookbookList, type CookbookListItem } from "./CookbookList";
import { RadioSheet } from "./RadioSheet";
import { ActionSheet } from "./ActionSheet";
import { TitleSheet } from "./TitleSheet";
import { FloatingAddButton } from "./FloatingAddButton";
import { createCookbook } from "@/app/actions/cookbooks";

type View = "cookbooks" | "all";

/**
 * The Recipes page's browser: the Cookbooks/All Recipes view toggle (default
 * Cookbooks), whichever list that picks, and the floating "+" that replaced
 * the old header New button — see the Recipes v2 plan's C1 phase. All
 * Recipes renders exactly what RecipeList always has; nothing about that
 * view changed.
 */
export function RecipesBrowser({
  recipes,
  cookbooks,
}: {
  recipes: RecipeListItem[];
  cookbooks: CookbookListItem[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("cookbooks");
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, startCreating] = useTransition();

  function handleCreateCookbook(title: string) {
    setCreateError(null);
    startCreating(async () => {
      const result = await createCookbook(title);
      if (result.error || !result.id) {
        setCreateError(result.error ?? "Something went wrong.");
        return;
      }
      // Title -> straight into the new empty book, no intermediate screen.
      router.push(`/kitchen/cooking/recipes/cookbooks/${result.id}`);
    });
  }

  return (
    <>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setViewSheetOpen(true)}
          className="flex items-center gap-1 text-2xl font-bold tracking-tight md:text-3xl"
        >
          {view === "cookbooks" ? "Cookbooks" : "All Recipes"}
          <ChevronDown aria-hidden="true" size={22} className="text-muted" />
        </button>
        <p className="mt-1 text-sm text-muted">
          {view === "cookbooks"
            ? `${cookbooks.length} ${cookbooks.length === 1 ? "cookbook" : "cookbooks"}`
            : `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"}`}
        </p>
      </div>

      {view === "cookbooks" ? (
        <CookbookList cookbooks={cookbooks} />
      ) : (
        <RecipeList recipes={recipes} />
      )}

      <FloatingAddButton onClick={() => setAddSheetOpen(true)} />

      {viewSheetOpen && (
        <RadioSheet
          title="View"
          options={[
            { value: "cookbooks" as View, label: "Cookbooks" },
            { value: "all" as View, label: "All Recipes" },
          ]}
          selected={view}
          onSelect={setView}
          onClose={() => setViewSheetOpen(false)}
        />
      )}

      {addSheetOpen && (
        <ActionSheet
          title="Add"
          onClose={() => setAddSheetOpen(false)}
          items={[
            {
              label: "Add a recipe",
              icon: <BookOpen aria-hidden="true" size={18} />,
              onClick: () => {
                setAddSheetOpen(false);
                router.push("/kitchen/cooking/recipes/new");
              },
            },
            {
              label: "Add a cookbook",
              icon: <LibraryBig aria-hidden="true" size={18} />,
              onClick: () => {
                setAddSheetOpen(false);
                setCreateOpen(true);
              },
            },
          ]}
        />
      )}

      {createOpen && (
        <TitleSheet
          heading="New cookbook"
          placeholder="Mom's Recipes"
          submitLabel="Create"
          pending={creating}
          error={createError}
          onSubmit={handleCreateCookbook}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </>
  );
}
