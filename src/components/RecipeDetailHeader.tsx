"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, MoreVertical, Printer, FileDown, Trash2 } from "lucide-react";
import { BackLink } from "./BackLink";
import { ActionSheet } from "./ActionSheet";
import { deleteRecipe } from "@/app/actions/recipes";

/**
 * The top of the redesigned recipe detail page: back link, then Edit + ⋯
 * on their own row (the title itself moved below the hero image). The ⋯
 * menu holds Export PDF, Print (both the same print-view route — see the
 * plan's "same print view" decision), and Delete, which still keeps the
 * house's single-tap-no-confirmation rule since it only ever touches this
 * one recipe.
 */
export function RecipeDetailHeader({
  recipeId,
  recipeTitle,
  canManage,
}: {
  recipeId: string;
  recipeTitle: string;
  /** True for admin/parent sessions — updateRecipe and deleteRecipe both
   * refuse a kid's session server-side (mission-6's C1), so Edit and
   * Delete are omitted entirely for one rather than shown-and-disabled.
   * Print/Export PDF stay available to everyone; neither writes anything. */
  canManage: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete() {
    setMenuOpen(false);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", recipeId);
      await deleteRecipe(formData);
    });
  }

  return (
    <>
      <BackLink href="/kitchen/cooking/recipes" label="Recipes" />

      <div className="mb-4 flex justify-end gap-2">
        {canManage && (
          <Link
            href={`/kitchen/cooking/recipes/${recipeId}/edit`}
            aria-label="Edit recipe"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface transition-colors active:bg-surface-2"
          >
            <Pencil aria-hidden="true" size={18} />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="More actions"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface transition-colors active:bg-surface-2"
        >
          <MoreVertical aria-hidden="true" size={18} />
        </button>
      </div>

      {menuOpen && (
        <ActionSheet
          title={recipeTitle}
          onClose={() => setMenuOpen(false)}
          items={[
            {
              label: "Print",
              icon: <Printer aria-hidden="true" size={18} />,
              onClick: () => {
                setMenuOpen(false);
                router.push(`/kitchen/cooking/recipes/${recipeId}/print`);
              },
            },
            {
              label: "Export PDF",
              icon: <FileDown aria-hidden="true" size={18} />,
              onClick: () => {
                setMenuOpen(false);
                router.push(`/kitchen/cooking/recipes/${recipeId}/print`);
              },
            },
            // Omitted entirely (not disabled) for a kid session — see the
            // canManage prop's own doc comment.
            ...(canManage
              ? [
                  {
                    label: "Delete",
                    icon: <Trash2 aria-hidden="true" size={18} />,
                    destructive: true,
                    onClick: handleDelete,
                  },
                ]
              : []),
          ]}
        />
      )}
    </>
  );
}
