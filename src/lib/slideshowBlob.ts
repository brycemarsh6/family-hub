import "server-only";

import { del, get, put } from "@vercel/blob";

import { PHOTO_TYPE } from "@/lib/slideshowPhotos";

// The only place that talks to Vercel Blob (a private store). No `token`
// option anywhere on purpose: the SDK finds its own credentials. On Vercel it
// signs in with the automatic OIDC token (VERCEL_OIDC_TOKEN plus BLOB_STORE_ID),
// so production holds no long-lived Blob secret. Locally it reads
// BLOB_READ_WRITE_TOKEN, which must be the DEV store's token. Callers are
// Server Actions and the image route; they check the login themselves.

/** Stores one JPEG at an exact pathname. Refuses to overwrite. Returns the stored pathname. */
export async function putSlideshowFile(pathname: string, bytes: Uint8Array): Promise<string> {
  const result = await put(pathname, Buffer.from(bytes), {
    access: "private",
    contentType: PHOTO_TYPE,
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  return result.pathname;
}

/** The file's stream, or null when it is missing or not a plain 200. */
export async function getSlideshowFile(
  pathname: string,
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return { stream: result.stream, contentType: result.blob.contentType };
}

/** Deletes files by pathname. Callers pass only paths they just created or read from a row. */
export async function deleteSlideshowFiles(pathnames: string[]): Promise<void> {
  if (pathnames.length === 0) return;
  await del(pathnames);
}
