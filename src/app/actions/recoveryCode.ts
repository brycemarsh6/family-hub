"use server";

// An admin makes a new recovery code (Settings). The old code stops working.
// Guard form (a): the Settings card is shown to admins only, but a refusal
// comes back as `{ error }` for the card to show.

import { getVerifiedUser } from "@/lib/dal";
import { makeRecoveryCodeFlow } from "@/lib/recoveryFlow";

export async function makeNewRecoveryCode(): Promise<
  { recoveryCode: string } | { error: string }
> {
  const user = await getVerifiedUser();
  if (!user || user.role !== "admin") {
    return { error: "Only an admin can make a recovery code." };
  }
  return makeRecoveryCodeFlow(user.userId);
}
