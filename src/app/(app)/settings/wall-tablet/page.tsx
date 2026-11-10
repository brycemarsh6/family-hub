import { BackLink } from "@/components/BackLink";
import { WallTabletSettings } from "@/components/WallTabletSettings";
import { MANAGER_ROLES } from "@/lib/constants";
import { requireRole } from "@/lib/dal";
import { NARROW_PAGE_CLASSES } from "@/lib/gridClasses";
import { SCREENSAVER_WORDS } from "@/lib/screensaver";
import { loadScreensaverSettings } from "@/lib/screensaverRead";
import { countSlideshowPhotos } from "@/lib/slideshowRead";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * Parents and admins: how the wall tablet's screensaver behaves. `requireRole`
 * bounces a kid or the tablet to `/`, and the save action checks the login
 * again. A short page: all of it, BackLink and title included, sits inside
 * NARROW_PAGE_CLASSES.
 */
export default async function WallTabletPage() {
  await requireRole(...MANAGER_ROLES);
  const [settings, photoCount] = await Promise.all([loadScreensaverSettings(), countSlideshowPhotos()]);

  return (
    <div className="py-2" data-page-width="wide">
      <div className={NARROW_PAGE_CLASSES}>
        <BackLink href="/settings" label="Settings" />

        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{SCREENSAVER_WORDS.title}</h1>
        <p className="mt-2 text-sm text-muted">{SCREENSAVER_WORDS.sub}</p>

        <WallTabletSettings initialSettings={settings} photoCount={photoCount} />
      </div>
    </div>
  );
}
