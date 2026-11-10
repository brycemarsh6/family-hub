import "server-only";

import { db } from "@/lib/db";
import { toScreensaverSettings, type ScreensaverSettings } from "@/lib/screensaver";

// The only place the ScreensaverSettings table is read. No login check: the
// callers (the (app) layout for a device login, the Wall tablet settings page
// and loadScreensaverShow) check who is asking. A missing row, or a value off
// its list, reads as the defaults.

export async function loadScreensaverSettings(): Promise<ScreensaverSettings> {
  const row = await db.screensaverSettings.findUnique({ where: { id: "household" } });
  return toScreensaverSettings(row);
}
