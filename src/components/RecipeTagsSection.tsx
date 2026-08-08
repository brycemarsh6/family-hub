"use client";

import { useState, useTransition } from "react";
import { Tag as TagIcon } from "lucide-react";
import { TagSelectSheet } from "./TagSelectSheet";
import { addTagToRecipe, removeTagFromRecipe } from "@/app/actions/tags";
import type { TagInfo } from "@/app/actions/tags";

/**
 * Tag chips on the recipe detail page, plus the "Update" entry point into
 * TagSelectSheet. Local state mirrors the server (same pattern
 * ShareRecipeControls and CookbookDetail already established) so toggling,
 * creating, renaming, and deleting a tag all feel instant.
 */
export function RecipeTagsSection({
  recipeId,
  initialTags,
  allTags,
}: {
  recipeId: string;
  /** This recipe's own tags. */
  initialTags: TagInfo[];
  /** The full vocabulary, for the picker. */
  allTags: TagInfo[];
}) {
  const [tags, setTags] = useState(initialTags);
  const [tagOptions, setTagOptions] = useState(allTags);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleToggle(tag: TagInfo) {
    const isSelected = tags.some((t) => t.id === tag.id);
    // tagOptions' recipeCount has to move with every toggle, not just
    // rename/delete — it's what the delete-confirm's "removes it from N
    // recipes" count reads (TagSelectSheet's activeTag comes straight from
    // this array), and leaving it frozen at whatever it was on page load
    // would understate it the moment anyone tags a second recipe in the
    // same session.
    if (isSelected) {
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
      setTagOptions((prev) =>
        prev.map((t) =>
          t.id === tag.id ? { ...t, recipeCount: Math.max(0, t.recipeCount - 1) } : t,
        ),
      );
      startTransition(async () => {
        await removeTagFromRecipe(recipeId, tag.id);
      });
    } else {
      setTags((prev) => [...prev, tag]);
      setTagOptions((prev) =>
        prev.map((t) => (t.id === tag.id ? { ...t, recipeCount: t.recipeCount + 1 } : t)),
      );
      startTransition(async () => {
        await addTagToRecipe(recipeId, tag.id);
      });
    }
  }

  function handleCreated(tag: TagInfo) {
    setTagOptions((prev) => [...prev, tag]);
  }

  function handleRenamed(tagId: string, name: string) {
    setTagOptions((prev) => prev.map((t) => (t.id === tagId ? { ...t, name } : t)));
    setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, name } : t)));
  }

  function handleDeleted(tagId: string) {
    setTagOptions((prev) => prev.filter((t) => t.id !== tagId));
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  }

  return (
    <section className="mb-6 border-t border-line pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tags</h2>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-9 items-center gap-1.5 text-sm font-medium text-accent"
        >
          <TagIcon aria-hidden="true" size={15} />
          {tags.length === 0 ? "Add tags" : "Update"}
        </button>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-muted">No tags yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {sheetOpen && (
        <TagSelectSheet
          selectedTagIds={tags.map((t) => t.id)}
          allTags={tagOptions}
          onToggle={handleToggle}
          onCreated={handleCreated}
          onRenamed={handleRenamed}
          onDeleted={handleDeleted}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </section>
  );
}
