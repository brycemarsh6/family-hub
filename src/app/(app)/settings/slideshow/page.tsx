import { BackLink } from "@/components/BackLink";
import { SlideshowPhotosManager } from "@/components/SlideshowPhotosManager";
import { MANAGER_ROLES } from "@/lib/constants";
import { requireRole } from "@/lib/dal";
import { listSlideshowPhotos } from "@/lib/slideshowRead";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * Parents and admins: the family photos the wall tablet will show. Add from
 * the camera roll, tap a photo to caption or delete it. `requireRole` bounces
 * a kid or the tablet to `/`, and the write actions check the login again.
 * The "N photos" line lives in the manager so it stays right as photos come
 * and go.
 */
export default async function SlideshowPhotosPage() {
  await requireRole(...MANAGER_ROLES);
  const photos = await listSlideshowPhotos();

  return (
    <div className="py-2" data-page-width="wide">
      <BackLink href="/settings" label="Settings" />

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Slideshow photos</h1>

      <SlideshowPhotosManager initialPhotos={photos} />
    </div>
  );
}
