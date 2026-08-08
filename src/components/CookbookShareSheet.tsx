"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Link2, Link2Off } from "lucide-react";
import { shareCookbook, stopSharingCookbook } from "@/app/actions/cookbooks";

/**
 * Share/revoke for a whole cookbook — the recipe-share machinery (R4)
 * pointed at a list, per the Recipes v2 plan. Same shape as ShareSheet, but
 * only the link (there's no "copy as text" equivalent for a multi-recipe
 * book), and with the one thing that's different about a cookbook link
 * said plainly: it follows the book's *current* contents, not a snapshot
 * taken when it was first shared.
 *
 * `shareToken` is owned by CookbookDetail (the same pattern that file
 * already uses for `title`/`recipes`), not mirrored into local state here —
 * so closing and reopening this sheet within the same session shows the
 * real current value instead of the prop CookbookDetail's page render
 * started with.
 */
export function CookbookShareSheet({
  cookbookId,
  shareToken,
  onShareTokenChange,
  onClose,
}: {
  cookbookId: string;
  shareToken: string | null;
  onShareTokenChange: (token: string | null) => void;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const shareUrl = shareToken
    ? `${typeof window === "undefined" ? "" : window.location.origin}/share/cookbook/${shareToken}`
    : null;

  async function copyLink() {
    if (!shareUrl) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — your browser blocked clipboard access.");
    }
  }

  function handleShare() {
    setError(null);
    startTransition(async () => {
      const result = await shareCookbook(cookbookId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onShareTokenChange(result.shareToken ?? null);
    });
  }

  function handleStopSharing() {
    setError(null);
    startTransition(async () => {
      const result = await stopSharingCookbook(cookbookId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onShareTokenChange(null);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share cookbook"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share cookbook</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {shareToken ? (
            <>
              <button
                type="button"
                onClick={copyLink}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium transition-colors active:bg-surface-2"
              >
                {copied ? (
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
                Anyone with this link can view every recipe currently in this
                cookbook — filing a new one in later adds it to what they see.
                The link stays live until you stop sharing.
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
            <>
              <button
                type="button"
                onClick={handleShare}
                disabled={isPending}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-medium transition-colors active:bg-surface-2 disabled:opacity-50"
              >
                <Link2 aria-hidden="true" size={18} />
                {isPending ? "Creating…" : "Create share link"}
              </button>
              <p className="px-1 text-sm text-muted">
                The link will always show whatever&apos;s currently in this
                cookbook — not a fixed snapshot of what&apos;s here today.
              </p>
            </>
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
      </div>
    </div>
  );
}
