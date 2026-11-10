"use server";

// Slideshow photos: parents and admins add, caption and delete the family
// photos the wall tablet will show. The bytes live in Vercel Blob (private),
// the row in SlideshowPhoto. Every action checks the login itself and returns
// a plain-English failure instead of throwing, because the page shows it
// inline. The rules are in src/lib/slideshowPhotos.ts.

import { revalidatePath } from "next/cache";

import { MANAGER_ROLES } from "@/lib/constants";
import { getVerifiedUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { deleteSlideshowFiles, putSlideshowFile } from "@/lib/slideshowBlob";
import {
  CAPTION_MAX,
  PHOTO_MAX_BYTES,
  PHOTO_TYPE,
  THUMB_MAX_BYTES,
  isTakenOn,
  normalizeCaption,
  photoPaths,
  toDimension,
} from "@/lib/slideshowPhotos";
import { SLIDESHOW_PHOTO_SELECT, loadSlideshowPhotoPaths, type SlideshowPhotoItem } from "@/lib/slideshowRead";

export type AddSlideshowPhotoResult =
  | { ok: true; photo: SlideshowPhotoItem }
  | { ok: false; error: string };
export type SlideshowPhotoResult = { ok: true } | { ok: false; error: string };

const NOT_ALLOWED = "Only parents and admins can change the slideshow photos.";
const ADD_FAILED = "That photo couldn't be added. Check your connection and try again.";

function refresh() {
  revalidatePath("/settings/slideshow");
  revalidatePath("/settings");
}

export async function addSlideshowPhoto(formData: FormData): Promise<AddSlideshowPhotoResult> {
  const user = await getVerifiedUser();
  if (!user || user.isDevice || !MANAGER_ROLES.includes(user.role)) {
    return { ok: false, error: NOT_ALLOWED };
  }
  // A hand-made POST can send anything; a malformed body is a plain failure.
  if (!(formData instanceof FormData)) return { ok: false, error: ADD_FAILED };

  const photo = formData.get("photo");
  const thumb = formData.get("thumb");
  if (!(photo instanceof File) || !(thumb instanceof File)) {
    return { ok: false, error: "That photo didn't come through. Please try again." };
  }
  if (photo.type !== PHOTO_TYPE || thumb.type !== PHOTO_TYPE) {
    return { ok: false, error: "Only JPEG photos can be added." };
  }
  if (photo.size === 0 || photo.size > PHOTO_MAX_BYTES || thumb.size === 0 || thumb.size > THUMB_MAX_BYTES) {
    return { ok: false, error: "That photo is too big. Try a smaller one." };
  }
  const width = toDimension(formData.get("width"));
  const height = toDimension(formData.get("height"));
  if (width === null || height === null) {
    return { ok: false, error: "That photo couldn't be read. Try a different one." };
  }
  const takenRaw = formData.get("takenOn");
  const takenOn = isTakenOn(takenRaw) ? takenRaw : null;

  // The id is made here (not by the database) so the file names can use it
  // before the row exists.
  const id = crypto.randomUUID();
  const { photoPath, thumbPath } = photoPaths(id);

  try {
    await putSlideshowFile(photoPath, new Uint8Array(await photo.arrayBuffer()));
  } catch (error) {
    console.error("Slideshow photo upload failed", error);
    // The put may have stored the file before it threw; deleting a missing path is harmless.
    await cleanUp([photoPath]);
    return { ok: false, error: ADD_FAILED };
  }
  try {
    await putSlideshowFile(thumbPath, new Uint8Array(await thumb.arrayBuffer()));
  } catch (error) {
    console.error("Slideshow thumbnail upload failed", error);
    await cleanUp([photoPath]);
    return { ok: false, error: ADD_FAILED };
  }

  let created: SlideshowPhotoItem;
  try {
    created = await db.slideshowPhoto.create({
      data: {
        id,
        photoPath,
        thumbPath,
        width,
        height,
        takenOn,
        uploadedById: user.userId,
        uploadedByName: user.displayName,
      },
      select: SLIDESHOW_PHOTO_SELECT,
    });
  } catch (error) {
    console.error("Slideshow photo save failed", error);
    await cleanUp([photoPath, thumbPath]);
    return { ok: false, error: ADD_FAILED };
  }

  refresh();
  return { ok: true, photo: created };
}

// Removes files this same call just uploaded. Never throws: the caller is
// already reporting a failure.
async function cleanUp(paths: string[]) {
  try {
    await deleteSlideshowFiles(paths);
  } catch (error) {
    console.error("Slideshow cleanup failed", paths, error);
  }
}

export async function updateSlideshowCaption(id: string, caption: string): Promise<SlideshowPhotoResult> {
  const user = await getVerifiedUser();
  if (!user || user.isDevice || !MANAGER_ROLES.includes(user.role)) {
    return { ok: false, error: NOT_ALLOWED };
  }
  if (typeof id !== "string" || id === "") return { ok: false, error: "That photo wasn't found." };

  const clean = normalizeCaption(caption);
  if (clean === null && typeof caption === "string" && caption.trim() !== "") {
    return { ok: false, error: `Captions can be up to ${CAPTION_MAX} characters.` };
  }

  try {
    const result = await db.slideshowPhoto.updateMany({ where: { id }, data: { caption: clean } });
    if (result.count === 0) return { ok: false, error: "That photo isn't there any more." };
  } catch (error) {
    console.error("Slideshow caption save failed", error);
    return { ok: false, error: "The caption didn't save. Please try again." };
  }
  refresh();
  return { ok: true };
}

export async function deleteSlideshowPhoto(id: string): Promise<SlideshowPhotoResult> {
  const user = await getVerifiedUser();
  if (!user || user.isDevice || !MANAGER_ROLES.includes(user.role)) {
    return { ok: false, error: NOT_ALLOWED };
  }
  if (typeof id !== "string" || id === "") return { ok: true };

  let paths: { photoPath: string; thumbPath: string } | null;
  try {
    paths = await loadSlideshowPhotoPaths(id);
    if (!paths) return { ok: true };
    await db.slideshowPhoto.deleteMany({ where: { id } });
  } catch (error) {
    console.error("Slideshow photo delete failed", error);
    return { ok: false, error: "That photo didn't delete. Please try again." };
  }

  // The photo is already unlisted, so a file that won't delete is logged, not
  // shown as a failure.
  try {
    await deleteSlideshowFiles([paths.photoPath, paths.thumbPath]);
  } catch (error) {
    console.error("Slideshow files not deleted", paths, error);
  }
  refresh();
  return { ok: true };
}
