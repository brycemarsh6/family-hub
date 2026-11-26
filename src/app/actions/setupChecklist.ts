"use server";

// Hides the "Finish setting up" card for the whole family. Admins only, and
// the check is first: a Server Action is a public POST endpoint.

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { dismissSetupChecklist } from "@/lib/householdSettingsWrites";

export async function dismissSetupChecklistAction(): Promise<void> {
  const user = await requireRole("admin");
  await dismissSetupChecklist(user.userId);
  revalidatePath("/");
}
