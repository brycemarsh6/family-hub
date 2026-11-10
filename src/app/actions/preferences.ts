"use server";

// Per-person settings. Today that is five things: the dashboard widget layout,
// the menu style, the start page, the text size and the "Show streaks" switch. Any signed-in
// ACCOUNT may save its own dashboard layout; a device-mode session (the wall
// tablet) is refused there, because it always shows the default layout and has
// no Customize button. The menu style and the text size are different: devices
// may save them too, since the wall tablet has its own Settings rows. Every row is keyed by the session's
// userId, never by anything the caller sends.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import {
  parseDashboardLayout,
  serializeDashboardLayout,
} from "@/lib/dashboardLayout";
import { MANAGER_ROLES } from "@/lib/constants";
import { NAV_MODES } from "@/lib/navMode";
import { START_PAGE_OPTIONS, START_PAGE_WORDS } from "@/lib/startPage";
import { TEXT_SIZES } from "@/lib/textSize";

export type PreferencesResult = { error?: string };

/**
 * Save the signed-in person's dashboard layout. The input is a claim from a
 * public POST endpoint, so it is run through parseDashboardLayout (which never
 * throws and repairs anything odd) and the cleaned layout is what gets stored.
 */
export async function saveDashboardLayout(
  input: unknown,
): Promise<PreferencesResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (user.isDevice) {
    return { error: "A shared device can't customize the dashboard." };
  }

  const dashboardLayout = serializeDashboardLayout(parseDashboardLayout(input));

  try {
    await db.userPreferences.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, dashboardLayout },
      update: { dashboardLayout },
    });
  } catch (err) {
    console.error("saveDashboardLayout failed", err);
    return { error: "Couldn't save your dashboard. Try again." };
  }

  revalidatePath("/");
  return {};
}

/**
 * Save the signed-in login's "Menu style". Devices may save their own (the
 * wall tablet picks its own). The value must be exactly one of NAV_MODES: an
 * unknown value is an error, not a silent default.
 */
export async function saveNavMode(input: unknown): Promise<PreferencesResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const navMode = NAV_MODES.find((mode) => mode === input);
  if (!navMode) return { error: "That isn't a menu style." };

  try {
    await db.userPreferences.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, navMode },
      update: { navMode },
    });
  } catch (err) {
    console.error("saveNavMode failed", err);
    return { error: "Couldn't save your menu style. Try again." };
  }

  revalidatePath("/", "layout");
  return {};
}

/**
 * Save the signed-in login's "Open Marshee on". Devices may save their own.
 * The value must be exactly one of START_PAGE_OPTIONS' hrefs: an unknown value
 * is an error, not a silent default.
 */
export async function saveStartPage(input: unknown): Promise<PreferencesResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const startPage = START_PAGE_OPTIONS.find((option) => option.href === input)?.href;
  if (!startPage) return { error: START_PAGE_WORDS.notAPage };

  try {
    await db.userPreferences.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, startPage },
      update: { startPage },
    });
  } catch (err) {
    console.error("saveStartPage failed", err);
    return { error: START_PAGE_WORDS.saveError };
  }

  revalidatePath("/", "layout");
  return {};
}

/**
 * Save the wall tablet's start page: written on every active device login.
 * Allowed for a device login (the tablet itself) or a parent or admin. The
 * value must be exactly one of START_PAGE_OPTIONS' hrefs.
 */
export async function saveTabletStartPage(input: unknown): Promise<PreferencesResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (!user.isDevice && !MANAGER_ROLES.includes(user.role)) {
    return { error: START_PAGE_WORDS.notAllowed };
  }

  const startPage = START_PAGE_OPTIONS.find((option) => option.href === input)?.href;
  if (!startPage) return { error: START_PAGE_WORDS.notAPage };

  try {
    const devices = await db.user.findMany({
      where: { role: "device", deactivatedAt: null },
      select: { id: true },
    });
    await db.$transaction(
      devices.map((device) =>
        db.userPreferences.upsert({
          where: { userId: device.id },
          create: { userId: device.id, startPage },
          update: { startPage },
        }),
      ),
    );
  } catch (err) {
    console.error("saveTabletStartPage failed", err);
    return { error: START_PAGE_WORDS.saveError };
  }

  revalidatePath("/", "layout");
  return {};
}

/**
 * Save the signed-in login's "Text size". Devices may save their own (the wall
 * tablet is the reason this setting exists). The value must be exactly one of
 * TEXT_SIZES: an unknown value is an error, not a silent default.
 */
export async function saveTextSize(input: unknown): Promise<PreferencesResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const textSize = TEXT_SIZES.find((size) => size === input);
  if (!textSize) return { error: "That isn't a text size." };

  try {
    await db.userPreferences.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, textSize },
      update: { textSize },
    });
  } catch (err) {
    console.error("saveTextSize failed", err);
    return { error: "Couldn't save your text size. Try again." };
  }

  revalidatePath("/", "layout");
  return {};
}

/**
 * Save the signed-in person's "Show streaks" switch. Like the dashboard
 * layout, a device-mode session is refused: the wall tablet is not a person
 * and its Settings page doesn't show the switch. Anything but a real boolean
 * is an error, not a silent default.
 */
export async function saveShowStreaks(input: unknown): Promise<PreferencesResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (user.isDevice) {
    return { error: "A shared device can't change streak settings." };
  }
  if (typeof input !== "boolean") return { error: "That isn't a valid choice." };

  try {
    await db.userPreferences.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, showStreaks: input },
      update: { showStreaks: input },
    });
  } catch (err) {
    console.error("saveShowStreaks failed", err);
    return { error: "Couldn't save your streak setting. Try again." };
  }

  revalidatePath("/", "layout");
  return {};
}
