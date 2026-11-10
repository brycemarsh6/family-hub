import { getVerifiedUser } from "@/lib/dal";
import { PHOTO_TYPE } from "@/lib/slideshowPhotos";
import { getSlideshowFile } from "@/lib/slideshowBlob";
import { loadSlideshowPhotoPaths } from "@/lib/slideshowRead";

// One slideshow photo, for the manage page's grid and sheet (and, later, the
// wall tablet). Not in proxy.ts's PUBLIC_ROUTES: the proxy's cookie check is
// only UX, so the real gate is here. Any signed-in login may view it (the
// Tablet login included); a signed-out request gets a plain 404, the same
// answer as an unknown id.
//
// Unlike the feedback screenshot route (no-store), this one caches in the
// browser for a year. A photo's bytes never change for a given id, so a cached
// copy can never be stale. A deleted photo can linger in one device's own
// cache, but it is no longer listed anywhere, so nothing asks for it. `private`
// keeps shared caches from ever holding a family photo.
// `?size=thumb` serves the small grid picture; anything else serves the full photo.
export const dynamic = "force-dynamic";

const NOT_FOUND = () => new Response("Not found", { status: 404 });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser();
  if (!user) return NOT_FOUND();

  const { id } = await params;
  const paths = await loadSlideshowPhotoPaths(id);
  if (!paths) return NOT_FOUND();

  const thumb = new URL(request.url).searchParams.get("size") === "thumb";
  const file = await getSlideshowFile(thumb ? paths.thumbPath : paths.photoPath);
  if (!file) return NOT_FOUND();

  return new Response(file.stream, {
    headers: {
      "Content-Type": PHOTO_TYPE,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
