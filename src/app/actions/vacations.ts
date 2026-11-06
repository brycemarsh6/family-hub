"use server";

// The Settings Vacation card's writes (decision 123): each login saves and
// deletes only their own, the tablet never. Guard order: session, the tablet
// refused, then the fields. There is no policy step: the writer is scoped to
// the signed-in person's id, so a vacation id that is not theirs finds
// nothing, and "not yours" and "gone" answer the same words. Server Actions
// are public POST endpoints: nothing here trusts the page that rendered them.

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { deleteVacation as deleteVacationRow, saveVacation as saveVacationRow } from "@/lib/habits/vacationWrites";
import { parseDateParam } from "@/lib/householdDate";

/** An `error` to show inline, or success (with the new vacation's `id` on save). */
export type VacationActionResult = { error?: string; id?: string };

const NOT_SIGNED_IN = "Not signed in.";
const DEVICE_REFUSAL = "The tablet can't set a vacation.";
const NOT_FOUND = "That vacation isn't available.";

function revalidateVacations() {
  revalidatePath("/habits", "layout");
  revalidatePath("/settings");
}

/** Save a vacation for you. `from` and `through` are `YYYY-MM-DD`, inclusive; From may be past. */
export async function saveVacation(from: string, through: string): Promise<VacationActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSAL };
  const start = typeof from === "string" ? parseDateParam(from) : null;
  const end = typeof through === "string" ? parseDateParam(through) : null;
  if (!start || !end) return { error: "Pick both days." };
  try {
    const saved = await saveVacationRow(user.userId, start, end, householdToday(new Date())!);
    if (!saved.ok) return { error: saved.error };
    revalidateVacations();
    return { id: saved.id };
  } catch (err) {
    console.error("saveVacation failed", err);
    return { error: "Couldn't save it. Try again." };
  }
}

/** Delete one of your vacations (one tap, no confirmation: the project rule). */
export async function deleteVacation(id: string): Promise<VacationActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSAL };
  if (typeof id !== "string") return { error: NOT_FOUND };
  try {
    if (!(await deleteVacationRow(id, user.userId, householdToday(new Date())!))) return { error: NOT_FOUND };
    revalidateVacations();
    return { id };
  } catch (err) {
    console.error("deleteVacation failed", err);
    return { error: "Couldn't delete it. Try again." };
  }
}
