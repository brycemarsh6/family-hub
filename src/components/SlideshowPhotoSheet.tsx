"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseDateParam } from "@/lib/householdDate";
import { FULL_MONTH_NAMES } from "@/lib/mealPlanDates";
import { CAPTION_MAX, normalizeCaption, slideshowImageUrl } from "@/lib/slideshowPhotos";
import type { SlideshowPhotoItem } from "@/lib/slideshowRead";

/** "November 3, 2026" from a `YYYY-MM-DD` camera date, or null. Read from the text, never through a Date, so no timezone can move it. */
function takenLabel(takenOn: string | null): string | null {
  const date = takenOn ? parseDateParam(takenOn) : null;
  return date ? `${FULL_MONTH_NAMES[date.month - 1]} ${date.day}, ${date.year}` : null;
}

/**
 * One slideshow photo: the picture, who added it and when it was taken, an
 * optional caption, Delete (one tap, no confirmation) and Done. Done saves the
 * caption only if it changed. Portaled to the body so the page's grid
 * container cannot trap the fixed overlay (STRUCTURE.md Wide pages rule 1);
 * it only exists after a tap, so `document.body` needs no server branch.
 */
export function SlideshowPhotoSheet({
  photo,
  altText,
  onClose,
  onDelete,
  onSaveCaption,
}: {
  photo: SlideshowPhotoItem;
  altText: string;
  onClose: () => void;
  /** Resolves to an error message, or null when deleted (the manager then closes the sheet). */
  onDelete: () => Promise<string | null>;
  /** Resolves to an error message, or null when saved. */
  onSaveCaption: (caption: string) => Promise<string | null>;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taken = takenLabel(photo.takenOn);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus goes into the sheet and comes back to the photo that opened it.
  useEffect(() => {
    const opener = document.activeElement;
    dialog.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  async function handleDone() {
    if (normalizeCaption(caption) === photo.caption) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    const failure = await onSaveCaption(caption);
    setSaving(false);
    if (failure) setError(failure);
    else onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const failure = await onDelete();
    // On success the manager closes the sheet, so only a failure comes back here.
    if (failure) {
      setDeleting(false);
      setError(failure);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Slideshow photo"
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg outline-none md:max-w-lg md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {/* A plain img: the route needs the login cookie, which the image optimizer would not send. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slideshowImageUrl(photo.id)}
          alt={altText}
          className="max-h-[50vh] w-full rounded-xl bg-surface-2 object-contain"
        />

        <p className="mt-3 text-sm text-muted">
          {taken ? `Taken ${taken} · added by ${photo.uploadedByName}` : `Added by ${photo.uploadedByName}`}
        </p>

        <label htmlFor="slideshow-caption" className="mt-3 text-sm font-medium">
          Caption (optional)
        </label>
        <input
          id="slideshow-caption"
          type="text"
          value={caption}
          maxLength={CAPTION_MAX}
          onChange={(event) => setCaption(event.target.value)}
          className="mt-1 h-12 w-full rounded-xl border border-line bg-surface px-3 text-base"
        />
        <p className="mt-1 text-right text-xs text-muted">
          {caption.length}/{CAPTION_MAX}
        </p>

        {error && (
          <p role="alert" className="mt-2 text-sm text-warn">
            {error}
          </p>
        )}

        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={saving || deleting}
            className="h-12 flex-1 rounded-xl border border-line text-base font-semibold text-danger transition-colors active:bg-surface-2 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            onClick={() => void handleDone()}
            disabled={saving || deleting}
            className="h-12 flex-1 rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
