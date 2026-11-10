// Client-only: shrinks a picked photo into the full picture and the small
// grid picture the slideshow stores, and reads the date it was taken. The
// phone's photo can be 12 MB or more; shrinking here keeps each upload to
// about 1 MB. Sizes and quality come from src/lib/slideshowPhotos.ts.

import "client-only";

import { readExifTakenOn } from "@/lib/exifDate";
import { PHOTO_LONG_EDGE, PHOTO_TYPE, THUMB_LONG_EDGE } from "@/lib/slideshowPhotos";

const PHOTO_QUALITY = 0.85;
const THUMB_QUALITY = 0.8;
const UNREADABLE = "That photo couldn't be read.";

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

export async function shrinkPhoto(
  file: File,
): Promise<{ photo: Blob; thumb: Blob; width: number; height: number; takenOn: string | null }> {
  const bytes = await file.arrayBuffer();
  const takenOn = readExifTakenOn(bytes);

  const decoded = await decode(file);
  try {
    const photoSize = fit(decoded.width, decoded.height, PHOTO_LONG_EDGE);
    const thumbSize = fit(decoded.width, decoded.height, THUMB_LONG_EDGE);
    const photo = await encode(decoded.source, photoSize, PHOTO_QUALITY);
    const thumb = await encode(decoded.source, thumbSize, THUMB_QUALITY);
    return { photo, thumb, width: photoSize.width, height: photoSize.height, takenOn };
  } finally {
    decoded.release();
  }
}

// "from-image" turns the picture upright the way the camera meant (iPhone
// photos are often stored sideways with a rotation note).
async function decode(file: File): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    // Older browsers: decode through an <img>, which applies the rotation itself.
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth < 1 || image.naturalHeight < 1) throw new Error(UNREADABLE);
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(UNREADABLE);
  }
}

// Longest side becomes `longEdge`; a smaller photo is never stretched.
function fit(width: number, height: number, longEdge: number): { width: number; height: number } {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function encode(
  source: CanvasImageSource,
  size: { width: number; height: number },
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error(UNREADABLE));
  context.drawImage(source, 0, 0, size.width, size.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(UNREADABLE))), PHOTO_TYPE, quality);
  });
}
