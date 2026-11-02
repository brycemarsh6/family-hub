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

export type PreferencesResult = { ok: true } | { ok: false; error: string };

/**
 * Save the signed-in person's dashboard layout. The input is a claim from a
 * public POST endpoint, so it is run through parseDashboardLayout (which never
 * throws and repairs anything odd) and the cleaned layout is what gets stored.
 */
export async function saveDashboardLayout(
  input: unknown,
): Promise<PreferencesResult> {
  const user = await getVerifiedUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (user.isDevice) {
    return { ok: false, error: "A shared device can't customize the dashboard." };
  }

  const dashboardLayout = serializeDashboardLayout(parseDashboardLayout(input));

  try {
    await db.userPreferences.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, dashboardLayout },
      update: { dashboardLayout },
    });
  } catch {
    return { ok: false, error: "Couldn't save your dashboard. Try again." };
  }

  revalidatePath("/");
  return { ok: true };
}
