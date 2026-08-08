"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, ChevronLeft, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { findOrCreateTag, renameTag, deleteTag } from "@/app/actions/tags";
import type { TagInfo } from "@/app/actions/tags";

/**
 * The tag picker for one recipe: search-or-create at the top, every tag in
 * the vocabulary below with a checkmark for whichever are already on this
 * recipe, and a per-tag ⋯ for rename/delete-with-count.
 *
 * One sheet with an internal `view` state machine, not several stacked
 * modal components — same pattern SlotEditSheet already established for
 * "a sheet that sometimes drills into a sub-task and comes back." Stacking
 * separate ActionSheet/TitleSheet/ConfirmSheet instances here would have
 * meant two independent Escape-key listeners fighting over which sheet a
 * single keypress should close.
 */
export function TagSelectSheet({
  selectedTagIds,
  allTags,
  onToggle,
  onCreated,
  onRenamed,
  onDeleted,
  onClose,
}: {
  selectedTagIds: string[];
  allTags: TagInfo[];
  onToggle: (tag: TagInfo) => void;
  onCreated: (tag: TagInfo) => void;
  onRenamed: (tagId: string, name: string) => void;
  onDeleted: (tagId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"main" | "menu" | "rename" | "delete">("main");
  const [activeTag, setActiveTag] = useState<TagInfo | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (view === "main") onClose();
        else setView("main");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, view]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? allTags.filter((tag) => tag.name.toLowerCase().includes(normalizedQuery))
    : allTags;
  const hasExactMatch = allTags.some((tag) => tag.name.toLowerCase() === normalizedQuery);
  const canCreate = normalizedQuery.length > 0 && !hasExactMatch;

  function handleCreate() {
    const name = query.trim();
    setError(null);
    startTransition(async () => {
      const result = await findOrCreateTag(name);
      if (result.error || !result.tag) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onCreated(result.tag);
      // Creating a tag from inside a recipe's own sheet also applies it —
      // the tag is guaranteed not-yet-selected here, so this always adds.
      onToggle(result.tag);
      setQuery("");
    });
  }

  function openMenu(tag: TagInfo) {
    setActiveTag(tag);
    setError(null);
    setView("menu");
  }

  function openRename() {
    if (!activeTag) return;
    setRenameValue(activeTag.name);
    setError(null);
    setView("rename");
  }

  function handleRenameSubmit() {
    if (!activeTag) return;
    const name = renameValue.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const result = await renameTag(activeTag.id, name);
      if (result.error) {
        setError(result.error);
        return;
      }
      onRenamed(activeTag.id, name);
      setView("main");
      setActiveTag(null);
    });
  }

  function handleDeleteConfirm() {
    if (!activeTag) return;
    startTransition(async () => {
      await deleteTag(activeTag.id);
      onDeleted(activeTag.id);
      setView("main");
      setActiveTag(null);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close without saving"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tags"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          {view !== "main" ? (
            <button
              type="button"
              onClick={() => setView("main")}
              className="flex min-h-11 items-center gap-1 -ml-1 text-lg font-semibold"
            >
              <ChevronLeft aria-hidden="true" size={20} />
              {view === "rename" ? "Rename tag" : activeTag?.name}
            </button>
          ) : (
            <h2 className="text-lg font-semibold">Tags</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        {view === "menu" && activeTag ? (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={openRename}
              className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2"
            >
              <Pencil aria-hidden="true" size={18} />
              Rename
            </button>
            <button
              type="button"
              onClick={() => setView("delete")}
              className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-danger transition-colors active:bg-surface-2"
            >
              <Trash2 aria-hidden="true" size={18} />
              Delete
            </button>
          </div>
        ) : view === "rename" ? (
          <div className="flex flex-col gap-4">
            <label className="block text-sm text-muted">
              <span className="mb-1 block">Name</span>
              <input
                type="text"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleRenameSubmit();
                }}
                autoComplete="off"
                autoFocus
                className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none"
              />
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
              >
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleRenameSubmit}
              disabled={pending || !renameValue.trim()}
              className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        ) : view === "delete" && activeTag ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              {activeTag.recipeCount === 0
                ? `"${activeTag.name}" isn't on any recipes.`
                : `Removes "${activeTag.name}" from ${activeTag.recipeCount} ${
                    activeTag.recipeCount === 1 ? "recipe" : "recipes"
                  }.`}
            </p>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={pending}
              className="min-h-12 w-full rounded-xl bg-danger text-base font-semibold text-white transition-opacity active:opacity-80 disabled:opacity-50"
            >
              {pending ? "Working…" : "Delete tag"}
            </button>
            <button
              type="button"
              onClick={() => setView("menu")}
              className="min-h-11 w-full rounded-xl text-sm font-medium text-muted transition-colors hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search or create a tag…"
              autoComplete="off"
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
            />

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
              >
                {error}
              </p>
            )}

            <div className="flex flex-col gap-1">
              {canCreate && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={pending}
                  className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-left text-sm font-semibold text-accent transition-colors active:bg-line disabled:opacity-50"
                >
                  <Plus aria-hidden="true" size={16} />
                  Create &quot;{query.trim()}&quot;
                </button>
              )}
              {filtered.length === 0 && !canCreate ? (
                <p className="px-1 py-6 text-center text-sm text-muted">
                  {allTags.length === 0 ? "No tags yet." : "No tags match that search."}
                </p>
              ) : (
                filtered.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <div key={tag.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onToggle(tag)}
                        className="flex min-h-12 flex-1 items-center justify-between gap-2 rounded-xl px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2"
                      >
                        <span className="truncate">{tag.name}</span>
                        {isSelected && (
                          <Check aria-hidden="true" size={18} className="shrink-0 text-accent" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openMenu(tag)}
                        aria-label={`${tag.name} actions`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2"
                      >
                        <MoreVertical aria-hidden="true" size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
