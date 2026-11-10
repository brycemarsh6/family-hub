"use server";

// The Server Action that pulls Google events into Marshee (mission 58).
// Two callers: the Calendar opening (any signed-in login, wall tablet
// included; it only pulls, at most every 5 minutes per calendar) and the
// Refresh button (parents and admins, a 30 second floor). Every input is an
// untrusted claim: `force` is honored only for a manager, and the answer is
// counts only, never anything from Google.

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { pullCalendars } from "@/lib/calendarEventPull";

type PullActionResult = { changed: boolean; failed: number; checked: number };

const NOTHING: PullActionResult = { changed: false, failed: 0, checked: 0 };

export async function pullGoogleEvents(force: boolean): Promise<PullActionResult> {
  const user = await getVerifiedUser();
  if (!user) return NOTHING;
  const manager = !user.isDevice && MANAGER_ROLES.includes(user.role);
  // Refresh from anyone else is refused, not downgraded: nothing is pulled.
  if (force === true && !manager) return NOTHING;

  const { changed, failed, checked } = await pullCalendars({ force: force === true });
  if (changed) {
    revalidatePath("/calendar");
    revalidatePath("/");
  }
  return { changed, failed, checked };
}
