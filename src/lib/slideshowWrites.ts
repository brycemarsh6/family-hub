import "server-only";

import { db } from "@/lib/db";
import { SLIDESHOW_PHOTO_SELECT, type SlideshowPhotoItem } from "@/lib/slideshowRead";

// The only place the SlideshowPhoto table is written. No login check and no
// revalidatePath: the actions in src/app/actions/slideshowPhotos.ts check the
// login, the Blob files and the page refresh around these.

export async function createSlideshowPhotoRow(data: {
  id: string;
  photoPath: string;
  thumbPath: string;
  width: number;
  height: number;
  takenOn: string | null;
  uploadedById: string;
  uploadedByName: string;
}): Promise<SlideshowPhotoItem> {
  return db.slideshowPhoto.create({ data, select: SLIDESHOW_PHOTO_SELECT });
}

/** How many rows changed (0 when the photo is gone). */
export async function updateSlideshowCaptionRow(id: string, caption: string | null): Promise<number> {
  const result = await db.slideshowPhoto.updateMany({ where: { id }, data: { caption } });
  return result.count;
}

export async function deleteSlideshowPhotoRow(id: string): Promise<void> {
  await db.slideshowPhoto.deleteMany({ where: { id } });
}
