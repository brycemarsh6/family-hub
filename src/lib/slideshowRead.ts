import "server-only";

import { db } from "@/lib/db";

// The only place the SlideshowPhoto table is read. The list never carries the
// Blob paths: the browser asks for pictures by id through
// /api/slideshow/[id]/image, which looks the paths up here. Callers are admin
// and parent pages and the image route: they check the login themselves.

export type SlideshowPhotoItem = {
  id: string;
  width: number;
  height: number;
  caption: string | null;
  takenOn: string | null;
  uploadedByName: string;
  createdAt: Date;
};

/** Newest first. */
export async function listSlideshowPhotos(): Promise<SlideshowPhotoItem[]> {
  return db.slideshowPhoto.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      width: true,
      height: true,
      caption: true,
      takenOn: true,
      uploadedByName: true,
      createdAt: true,
    },
  });
}

/** Where one photo's files live, or null when the id is unknown. */
export async function loadSlideshowPhotoPaths(
  id: string,
): Promise<{ photoPath: string; thumbPath: string } | null> {
  return db.slideshowPhoto.findUnique({
    where: { id },
    select: { photoPath: true, thumbPath: true },
  });
}

export async function countSlideshowPhotos(): Promise<number> {
  return db.slideshowPhoto.count();
}
