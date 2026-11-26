import "server-only";

import { db } from "@/lib/db";
import { HOUSEHOLD_PERSON_WHERE } from "@/lib/householdPeople";
import { ADJUST_PERSON_REFUSAL } from "@/lib/rewardVocabulary";

// The one writer of StarAdjustment rows (mission 83), a domain write module:
// no login check (the action checks), no `revalidatePath`.

/** Add one bonus (positive) or taken-away (negative) line for an active household person. A person who is not one (a device login, a deactivated or unknown id) is refused with a word, not a throw. */
export async function addStarAdjustment(input: {
  userId: string;
  amount: number;
  note: string | null;
  createdById: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const person = await db.user.findFirst({ where: { ...HOUSEHOLD_PERSON_WHERE, id: input.userId }, select: { id: true } });
  if (!person) return { ok: false, error: ADJUST_PERSON_REFUSAL };
  const row = await db.starAdjustment.create({
    data: { userId: person.id, amount: input.amount, note: input.note, createdById: input.createdById },
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

/** Undo a bonus or taken-away line: delete the row, which puts the bank back. Already gone is fine. */
export async function removeStarAdjustment(id: string): Promise<void> {
  await db.starAdjustment.deleteMany({ where: { id } });
}
