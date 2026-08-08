"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, X } from "lucide-react";
import { RecipeForm, type RecipeFormDefaults } from "./RecipeForm";
import { createRecipe, extractRecipeFromRecipePhotos } from "@/app/actions/recipes";

type Photo = { mediaType: "image/jpeg"; data: string; previewUrl: string };

const MAX_PHOTOS = 3;
// Raw phone photos run 3-10MB — re-encoding to this long edge before upload
// is what keeps the Server Action body (next.config.ts) small and the
// Claude call fast, without asking the user to do anything about it.
const MAX_LONG_EDGE = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Photo import: up to 3 photos (cookbook page, handwritten card, or a
 * screenshot), each downscaled client-side the moment it's picked, then the
 * same RecipeForm every other path uses — pre-filled, fully editable,
 * nothing written to the database until Save is tapped.
 */
export function PhotoImportForm({ cookbookId }: { cookbookId?: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<RecipeFormDefaults | null>(null);
  // Bumped on every successful extraction so RecipeForm remounts — see the
  // same note in PasteImportForm about uncontrolled inputs.
  const [version, setVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    // The input is `multiple`, so this can be several photos at once — the
    // library picker lets you tick two pages of one recipe in a single go.
    // Only take as many as there's room for; the rest are ignored rather
    // than silently replacing what's already added.
    const room = MAX_PHOTOS - photos.length;
    const files = Array.from(event.target.files ?? []).slice(0, room);
    // Clears the input's own value so picking the same file twice in a row
    // still fires onChange — otherwise a second identical pick is a no-op.
    event.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setIsReadingFile(true);
    try {
      // Sequential, not Promise.all: each downscale decodes a full-size
      // phone photo into a canvas, and doing three at once on a phone is a
      // real memory spike for no meaningful speed gain.
      const added: Photo[] = [];
      for (const file of files) {
        added.push(await downscale(file));
      }
      setPhotos((prev) => [...prev, ...added].slice(0, MAX_PHOTOS));
    } catch {
      setError("Couldn't read that photo. Try another one.");
    } finally {
      setIsReadingFile(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleExtract() {
    setError(null);
    startTransition(async () => {
      const result = await extractRecipeFromRecipePhotos(
        photos.map(({ mediaType, data }) => ({ mediaType, data })),
      );
      if (result.error || !result.data) {
        setError(result.error ?? "Something went wrong. Try again.");
        return;
      }
      setExtracted({
        title: result.data.title,
        ingredients: result.data.ingredients.join("\n"),
        steps: result.data.steps.join("\n"),
        servings: result.data.servings,
        prepTime: result.data.prepTime,
        cookTime: result.data.cookTime,
        sourceUrl: "",
        notes: "",
      });
      setVersion((v) => v + 1);
    });
  }

  if (extracted) {
    return (
      <div>
        <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-base font-medium text-accent">
          Extracted — review and edit before saving.
        </p>
        <RecipeForm
          key={version}
          action={createRecipe}
          submitLabel="Save recipe"
          defaultValues={extracted}
          cookbookId={cookbookId}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl border border-line"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a local canvas data URL, not an optimizable remote asset */}
            <img
              src={photo.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadingFile}
            className="flex aspect-square w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-muted disabled:opacity-50"
          >
            <Camera aria-hidden="true" size={22} />
            <span className="text-xs">
              {isReadingFile ? "Adding…" : "Add photo"}
            </span>
          </button>
        )}
      </div>

      {/* Deliberately NO `capture` attribute. It reads like a hint but it
          isn't: on iOS, capture="environment" opens the camera directly and
          removes "Photo Library" and "Choose File" from the sheet entirely.
          That broke the most common real case — a recipe already sitting in
          the camera roll as a screenshot, which is exactly where the
          household's recipes live. Without it, `accept="image/*"` gives the
          normal iOS sheet with Take Photo, Photo Library, and Choose File,
          so the camera is still one tap away. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelected}
        className="hidden"
      />

      <p className="text-sm text-muted">
        {photos.length === 0
          ? "Add up to 3 photos — extra pages of the same recipe are fine."
          : `${photos.length} of ${MAX_PHOTOS} photos added.`}
      </p>

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
        onClick={handleExtract}
        disabled={isPending || photos.length === 0}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {isPending ? "Extracting…" : "Extract recipe"}
      </button>
    </div>
  );
}

async function downscale(file: File): Promise<Photo> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  const jpegDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const data = jpegDataUrl.slice(jpegDataUrl.indexOf(",") + 1);
  return { mediaType: "image/jpeg", data, previewUrl: jpegDataUrl };
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}
