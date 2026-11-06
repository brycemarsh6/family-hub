"use server";

// The admin side of Send feedback: mark a report done (or new again) and
// delete one. Redirecting guard form: both actions' only UI is the
// /settings/feedback page, itself behind requireRole("admin") (STRUCTURE.md,
// guard forms; users.ts is the same case).

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

function refreshFeedbackViews() {
  revalidatePath("/settings/feedback");
  revalidatePath("/settings");
}

export async function markFeedbackDone(id: string, done: boolean): Promise<void> {
  await requireRole("admin");
  // updateMany: a report deleted on another device is a no-op, not an error.
  await db.feedback.updateMany({ where: { id }, data: { doneAt: done ? new Date() : null } });
  refreshFeedbackViews();
}

export async function deleteFeedback(id: string): Promise<void> {
  await requireRole("admin");
  await db.feedback.deleteMany({ where: { id } });
  refreshFeedbackViews();
}
