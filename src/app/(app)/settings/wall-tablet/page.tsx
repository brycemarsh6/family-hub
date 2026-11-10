import { redirect } from "next/navigation";

import { BackLink } from "@/components/BackLink";
import { StartPageSetting } from "@/components/StartPageSetting";
import { WallTabletSettings } from "@/components/WallTabletSettings";
import { MANAGER_ROLES } from "@/lib/constants";
import { requireVerifiedUser } from "@/lib/dal";
import { NARROW_PAGE_CLASSES } from "@/lib/gridClasses";
import { SCREENSAVER_WORDS } from "@/lib/screensaver";
import { loadScreensaverSettings } from "@/lib/screensaverRead";
import { countSlideshowPhotos } from "@/lib/slideshowRead";
import { loadTabletStartPage } from "@/lib/startPageRead";
import { tabletMayChangeWallTablet } from "@/lib/tabletRules";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * Parents, admins and the wall tablet itself: how the screensaver behaves and
 * where a tap on it goes. A kid is sent to `/` (`tabletMayChangeWallTablet`
 * is the tablet's gate), and the save actions check the login again. The
 * tablet gets no link to Slideshow photos (that page stays parents and admins
 * only), so it is not sent the count. A short page: all of it, BackLink and
 * title included, sits inside NARROW_PAGE_CLASSES.
 */
export default async function WallTabletPage() {
  const user = await requireVerifiedUser();
  const canManagePhotos = MANAGER_ROLES.includes(user.role);
  if (!canManagePhotos && !tabletMayChangeWallTablet(user.role)) redirect("/");
  const [settings, photoCount, startPage] = await Promise.all([
    loadScreensaverSettings(),
    canManagePhotos ? countSlideshowPhotos() : 0,
    loadTabletStartPage(),
  ]);

  return (
    <div className="py-2" data-page-width="wide">
      <div className={NARROW_PAGE_CLASSES}>
        <BackLink href="/settings" label="Settings" />

        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{SCREENSAVER_WORDS.title}</h1>
        <p className="mt-2 text-sm text-muted">{SCREENSAVER_WORDS.sub}</p>

        {startPage !== null && <StartPageSetting forTablet startPage={startPage} />}

        <WallTabletSettings initialSettings={settings} photoCount={photoCount} canManagePhotos={canManagePhotos} />
      </div>
    </div>
  );
}
