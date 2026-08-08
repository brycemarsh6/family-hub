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

export type RecipeWithTags = RecipeListItem & { tagIds: string[] };
type TagOption = { id: string; name: string };

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
  tags,
}: {
  recipes: RecipeWithTags[];
  cookbooks: CookbookListItem[];
  /** The full tag vocabulary — filter chips on All Recipes only (filtering
   * a cookbook by tag is ambiguous and out of scope, per the plan). */
  tags: TagOption[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("cookbooks");
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, startCreating] = useTransition();
  // Single-select, same pattern as Inventory's location chips — null means
  // "All".
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const visibleRecipes = selectedTagId
    ? recipes.filter((recipe) => recipe.tagIds.includes(selectedTagId))
    : recipes;

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
        <>
          {tags.length > 0 && (
            <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTagId(null)}
                  aria-pressed={selectedTagId === null}
                  className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                    selectedTagId === null
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-line bg-surface text-muted"
                  }`}
                >
                  All ({recipes.length})
                </button>
                {tags.map((tag) => {
                  const active = selectedTagId === tag.id;
                  const count = recipes.filter((r) => r.tagIds.includes(tag.id)).length;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setSelectedTagId(tag.id)}
                      aria-pressed={active}
                      className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                        active
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-line bg-surface text-muted"
                      }`}
                    >
                      {tag.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <RecipeList
            recipes={visibleRecipes}
            emptyTitle={selectedTagId ? "No matches" : undefined}
            emptyHint={
              selectedTagId
                ? `No recipes tagged "${tags.find((t) => t.id === selectedTagId)?.name}".`
                : undefined
            }
          />
        </>
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
