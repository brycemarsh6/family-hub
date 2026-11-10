"use client";

import { useRef, useState } from "react";
import { ImagePlus, MessageSquare } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { SlideshowPhotoSheet } from "@/components/SlideshowPhotoSheet";
import { addSlideshowPhoto, deleteSlideshowPhoto, updateSlideshowCaption } from "@/app/actions/slideshowPhotos";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { shrinkPhoto } from "@/lib/shrinkPhoto";
import type { SlideshowPhotoItem } from "@/lib/slideshowRead";

/** 3 across on a phone, more as the page's own width grows (container variants, never screen breakpoints). */
const GRID_CLASSES = "grid grid-cols-3 gap-2 @min-[40rem]:grid-cols-5 @min-[60rem]:grid-cols-7";

const addedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: HOUSEHOLD_TIME_ZONE });

function altText(photo: SlideshowPhotoItem): string {
  return photo.caption ?? `Photo added ${addedDate.format(new Date(photo.createdAt))}`;
}

function countLine(count: number): string {
  if (count === 0) return "No photos yet. Add some to show on the wall tablet.";
  return `${count} ${count === 1 ? "photo" : "photos"}. They show on the wall tablet.`;
}

/**
 * The Slideshow photos page body: Add photos, upload progress, the grid, and
 * the sheet for one photo. Files go up one at a time (each is shrunk in the
 * browser first), so a failure never stops the rest.
 */
export function SlideshowPhotosManager({ initialPhotos }: { initialPhotos: SlideshowPhotoItem[] }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [openId, setOpenId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [failed, setFailed] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const open = photos.find((photo) => photo.id === openId) ?? null;
  const busy = progress !== null;

  async function upload(files: File[]) {
    setError(null);
    setFailed([]);
    const missed: File[] = [];
    for (let index = 0; index < files.length; index += 1) {
      setProgress({ current: index + 1, total: files.length });
      try {
        const shrunk = await shrinkPhoto(files[index]);
        const formData = new FormData();
        formData.append("photo", shrunk.photo, "photo.jpg");
        formData.append("thumb", shrunk.thumb, "thumb.jpg");
        formData.append("width", String(shrunk.width));
        formData.append("height", String(shrunk.height));
        if (shrunk.takenOn) formData.append("takenOn", shrunk.takenOn);
        const result = await addSlideshowPhoto(formData);
        if (result.ok) {
          setPhotos((current) => [result.photo, ...current]);
        } else {
          missed.push(files[index]);
          setError(result.error);
        }
      } catch {
        missed.push(files[index]);
      }
    }
    setProgress(null);
    setFailed(missed);
  }

  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) void upload(files);
  }

  // Delete waits for the server (DESIGN.md: a one-shot destructive verb is not optimistic).
  // Nothing changes on screen until it says ok; the sheet shows any error.
  async function handleDelete(photo: SlideshowPhotoItem) {
    const result = await deleteSlideshowPhoto(photo.id);
    if (!result.ok) return result.error;
    setOpenId(null);
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
    return null;
  }

  async function handleSaveCaption(photo: SlideshowPhotoItem, caption: string) {
    const result = await updateSlideshowCaption(photo.id, caption);
    if (!result.ok) return result.error;
    const saved = caption.trim().replace(/\s+/g, " ") || null;
    setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, caption: saved } : item)));
    return null;
  }

  return (
    <>
      <p className="mb-4 mt-1 text-sm text-muted">{countLine(photos.length)}</p>

      <input ref={input} type="file" accept="image/*" multiple onChange={handlePick} className="hidden" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        <ImagePlus aria-hidden="true" size={20} />
        Add photos
      </button>

      {progress && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-3" role="status">
          <p className="mb-2 text-sm font-medium">
            Adding {progress.current} of {progress.total} {progress.total === 1 ? "photo" : "photos"}
          </p>
          <ProgressBar fraction={(progress.current - 1) / progress.total} label="Photos added so far" />
        </div>
      )}

      {!busy && failed.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
          <p className="text-sm text-warn">
            {failed.length} {failed.length === 1 ? "photo" : "photos"} couldn&apos;t be added.
          </p>
          <button
            type="button"
            onClick={() => void upload(failed)}
            className="flex h-11 shrink-0 items-center rounded-xl border border-line px-4 text-sm font-semibold transition-colors active:bg-surface-2"
          >
            Try again
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-warn">
          {error}
        </p>
      )}

      {/* The container wraps the grid only; the sheet portals to the body (STRUCTURE.md Wide pages rule 1). */}
      <div className="@container mt-4">
        <ul className={GRID_CLASSES}>
          {photos.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setOpenId(photo.id)}
                aria-label={`Open photo: ${altText(photo)}`}
                className="relative block aspect-square min-h-12 w-full overflow-hidden rounded-lg bg-surface-2 transition-opacity active:opacity-70"
              >
                {/* A plain img: the route needs the login cookie, which the image optimizer would not send. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/slideshow/${photo.id}/image?size=thumb`}
                  alt={altText(photo)}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {photo.caption && (
                  <span className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1 text-white">
                    <MessageSquare aria-hidden="true" size={12} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {open && (
        <SlideshowPhotoSheet
          key={open.id}
          photo={open}
          altText={altText(open)}
          onClose={() => setOpenId(null)}
          onDelete={() => handleDelete(open)}
          onSaveCaption={(caption) => handleSaveCaption(open, caption)}
        />
      )}
    </>
  );
}
