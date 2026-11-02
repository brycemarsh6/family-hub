"use server";

// Per-person settings. Today that is one thing: the dashboard widget layout.
// Any signed-in ACCOUNT may save its own; a device-mode session (the wall
// tablet) is refused, because it always shows the default layout and has no
// Customize button. The row is keyed by the session's userId, never by
// anything the caller sends.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import {
  parseDashboardLayout,
  serializeDashboardLayout,
} from "@/lib/dashboardLayout";
import { NAV_MODES } from "@/lib/navMode";

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
