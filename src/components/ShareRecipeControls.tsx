"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Link2, Link2Off } from "lucide-react";
import { shareRecipe, stopSharingRecipe } from "@/app/actions/recipes";
import { recipeLines } from "@/lib/recipeText";

/**
 * The two ways a recipe leaves the house:
 *
 * - **Copy as text** — plain text straight to the clipboard, for pasting
 *   into a group chat. No link, no server round trip, nothing to revoke.
 * - **Share link** — an unguessable public URL. Off by default; creating
 *   it is a deliberate tap, and "Stop sharing" kills it immediately.
 */
export function ShareRecipeControls({
  recipeId,
  title,
  ingredients,
  steps,
  initialShareToken,
}: {
  recipeId: string;
  title: string;
  ingredients: string;
  steps: string;
  initialShareToken: string | null;
}) {
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState<"text" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Built in the browser so the link always matches wherever the app is
  // actually being used — localhost during development, the real domain in
  // production — instead of hard-coding a host that would be wrong in one
  // of those places.
  const shareUrl = shareToken
    ? `${typeof window === "undefined" ? "" : window.location.origin}/share/recipe/${shareToken}`
    : null;

  async function copy(value: string, which: "text" | "link") {
    setError(null);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Couldn't copy — your browser blocked clipboard access.");
    }
  }

  function handleCopyText() {
    const parts = [title, "", "Ingredients", ...recipeLines(ingredients)];
    const stepLines = recipeLines(steps);
    if (stepLines.length > 0) {
      parts.push("", "Steps");
      stepLines.forEach((step, index) => parts.push(`${index + 1}. ${step}`));
    }
    copy(parts.join("\n"), "text");
  }

  function handleShare() {
    setError(null);
    startTransition(async () => {
      const result = await shareRecipe(recipeId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShareToken(result.shareToken ?? null);
    });
  }

  function handleStopSharing() {
    setError(null);
    startTransition(async () => {
      const result = await stopSharingRecipe(recipeId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShareToken(null);
    });
  }

  return (
    <section className="mb-6 border-t border-line pt-4">
      <h2 className="mb-2 text-lg font-semibold">Share</h2>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleCopyText}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium transition-colors active:bg-surface-2"
        >
          {copied === "text" ? (
            <>
              <Check aria-hidden="true" size={18} />
              Copied
            </>
          ) : (
            <>
              <Copy aria-hidden="true" size={18} />
              Copy as text
            </>
          )}
        </button>

        {shareToken ? (
          <>
            <button
              type="button"
              onClick={() => shareUrl && copy(shareUrl, "link")}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium transition-colors active:bg-surface-2"
            >
              {copied === "link" ? (
                <>
                  <Check aria-hidden="true" size={18} />
                  Link copied
                </>
              ) : (
                <>
                  <Link2 aria-hidden="true" size={18} />
                  Copy share link
                </>
              )}
            </button>
            <p className="px-1 text-sm text-muted">
              Anyone with this link can view this recipe. It stays live until
              you stop sharing.
            </p>
            <button
              type="button"
              onClick={handleStopSharing}
              disabled={isPending}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium text-danger transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              <Link2Off aria-hidden="true" size={16} />
              {isPending ? "Working…" : "Stop sharing"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleShare}
            disabled={isPending}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium transition-colors active:bg-surface-2 disabled:opacity-50"
          >
            <Link2 aria-hidden="true" size={18} />
            {isPending ? "Creating…" : "Create share link"}
          </button>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
