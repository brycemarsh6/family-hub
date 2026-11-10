// The rules for slideshow photos, with no imports on purpose: importable from
// a Server Action, a server page and a client component alike, and testable
// without a database or Blob (slideshowPhotos.test.ts). The storage lives in
// src/lib/slideshowBlob.ts, the reading in src/lib/slideshowRead.ts.

export const CAPTION_MAX = 80;

/** The most bytes of one full photo we accept (the browser aims for about 1 MB). */
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

/** The most bytes of one thumbnail we accept. */
export const THUMB_MAX_BYTES = 512 * 1024;

export const PHOTO_LONG_EDGE = 2048;
export const THUMB_LONG_EDGE = 400;

export const PHOTO_TYPE = "image/jpeg";

const DIMENSION_MAX = 8192;

/**
 * Trims and collapses inner whitespace. Empty (or not a string) is null. Over
 * CAPTION_MAX is also null, never truncated: the caller decides whether that
 * is an error, because it cannot tell "empty" from "too long" otherwise.
 */
export function normalizeCaption(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const caption = raw.trim().replace(/\s+/g, " ");
  if (caption.length === 0 || caption.length > CAPTION_MAX) return null;
  return caption;
}

/** A real calendar date written YYYY-MM-DD, years 1900 to 2100. */
export function isTakenOn(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/** The two Blob pathnames for one photo id. */
export function photoPaths(id: string): { photoPath: string; thumbPath: string } {
  return { photoPath: `slideshow/${id}.jpg`, thumbPath: `slideshow/${id}-thumb.jpg` };
}

/** A whole number of pixels, 1 to 8192, else null. Form fields arrive as digit strings. */
export function toDimension(raw: unknown): number | null {
  const value = typeof raw === "string" && /^\d{1,5}$/.test(raw) ? Number(raw) : raw;
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= 1 && value <= DIMENSION_MAX ? value : null;
}
