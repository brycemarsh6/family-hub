"use server";

// The wall tablet's screensaver. saveScreensaverSetting is for parents, admins
// and the tablet's own device login (one field per tap); loadScreensaverShow is for the tablet's device
// login alone and hands back fresh settings and photos each time the
// slideshow is about to start. Both check the login themselves and never
// throw. The rules are in src/lib/screensaver.ts.

import { revalidatePath } from "next/cache";

import { MANAGER_ROLES } from "@/lib/constants";
import { getVerifiedUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { tabletMayChangeWallTablet } from "@/lib/tabletRules";
import { parseScreensaverField, type ScreensaverSettings } from "@/lib/screensaver";
import { loadScreensaverSettings } from "@/lib/screensaverRead";
import { listSlideshowShowItems, type SlideshowShowItem } from "@/lib/slideshowRead";

export type SaveScreensaverResult = { ok: true } | { ok: false; error: string };

export async function saveScreensaverSetting(field: unknown, value: unknown): Promise<SaveScreensaverResult> {
  const user = await getVerifiedUser();
  if (!user || (!MANAGER_ROLES.includes(user.role) && !tabletMayChangeWallTablet(user.role))) {
    return { ok: false, error: "Only parents, admins and the wall tablet can change these settings." };
  }
  const parsed = parseScreensaverField(field, value);
  if (!parsed) return { ok: false, error: "That setting isn't allowed." };

  const data = { [parsed.field]: parsed.value } as Partial<ScreensaverSettings>;
  try {
    await db.screensaverSettings.upsert({
      where: { id: "household" },
      create: { id: "household", ...data, updatedById: user.userId },
      update: { ...data, updatedById: user.userId },
    });
  } catch (error) {
    console.error("Screensaver setting save failed", error);
    return { ok: false, error: "That didn't save. Please try again." };
  }
  revalidatePath("/settings/wall-tablet");
  return { ok: true };
}

/** Fresh settings and photos for the tablet; null for anyone but a device login (or on a failed read). */
export async function loadScreensaverShow(): Promise<{
  settings: ScreensaverSettings;
  photos: SlideshowShowItem[];
  startPage: string;
} | null> {
  const user = await getVerifiedUser();
  if (!user || !user.isDevice) return null;
  try {
    const [settings, photos] = await Promise.all([loadScreensaverSettings(), listSlideshowShowItems()]);
    return { settings, photos, startPage: user.startPage };
  } catch (error) {
    console.error("Screensaver show load failed", error);
    return null;
  }
}
