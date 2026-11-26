import "server-only";

import { db } from "@/lib/db";
import { isOwnerCopy } from "@/lib/copyConfig";
import { hashPassword } from "@/lib/password";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/loginRateLimit";
import { setupFinished } from "@/lib/householdSettingsRead";
import { createFamilyAndFirstAdmin } from "@/lib/householdSettingsWrites";
import { generateRecoveryCode, normalizeRecoveryCode } from "@/lib/recoveryCode";
import {
  checkSetupInput,
  setupCodeMatches,
  setupIsOpen,
  SETUP_RATE_LIMIT_KEY,
} from "@/lib/setupGate";

// The whole first-run setup, from the code check to the first admin login.
// No login check and no cookies: nobody has an account yet, so the setup code
// is the gate. `ip` is a parameter so prisma/setup-attack-smoke.ts can drive
// this directly. The setup code, the password and the recovery code are never
// logged.

/** Whether /setup may be used right now on this copy. */
export async function isSetupOpen(): Promise<boolean> {
  return setupIsOpen({
    ownerCopy: isOwnerCopy(),
    configuredCode: process.env.SETUP_CODE,
    userCount: await db.user.count(),
    setupFinished: await setupFinished(),
  });
}

export type SetupLinkStatus = "ok" | "bad" | "limited";

/** The three refusals shared by the link check and the create: closed, rate
 * limited, wrong code (the wrong code is counted). Null means go on. */
async function gate(code: string, ip: string): Promise<"bad" | "limited" | null> {
  if (!(await isSetupOpen())) return "bad";
  const limit = await isLoginRateLimited(SETUP_RATE_LIMIT_KEY, ip);
  if (limit.limited) return "limited";
  if (!setupCodeMatches(code, process.env.SETUP_CODE)) {
    await recordLoginAttempt({ userId: SETUP_RATE_LIMIT_KEY, ip, success: false });
    return "bad";
  }
  return null;
}

export async function checkSetupLinkFlow(code: string, ip: string): Promise<SetupLinkStatus> {
  return (await gate(code, ip)) ?? "ok";
}

export type CreateFamilyResult =
  | { status: "bad" | "limited" }
  | { error: string }
  | { userId: string; recoveryCode: string };

export async function createFamilyFlow(
  input: {
    code: string;
    familyName: string;
    displayName: string;
    password: string;
    passwordAgain: string;
  },
  ip: string,
): Promise<CreateFamilyResult> {
  const refused = await gate(input.code, ip);
  if (refused) return { status: refused };

  const checked = checkSetupInput(input);
  if (!checked.ok) return { error: checked.error };

  const passwordHash = await hashPassword(input.password);
  const recoveryCode = generateRecoveryCode();
  const plain = normalizeRecoveryCode(recoveryCode);
  if (!plain) throw new Error("A fresh recovery code did not normalize.");
  const recoveryCodeHash = await hashPassword(plain);

  const made = await createFamilyAndFirstAdmin({
    familyName: checked.familyName,
    displayName: checked.displayName,
    passwordHash,
    recoveryCodeHash,
  });
  if ("closed" in made) return { status: "bad" };
  return { userId: made.userId, recoveryCode };
}
