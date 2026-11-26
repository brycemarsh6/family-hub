"use server";

// First-run setup on a family copy. Deliberately UNGUARDED (no DAL check):
// setup exists for the moment nobody has an account. The gate is the setup
// code, and each flow rechecks that setup is open (no user yet, not Bryce's
// copy, SETUP_CODE configured), rate limits wrong codes, and refuses a wrong
// code before anything is written. See src/lib/setupFlow.ts.

import { headers } from "next/headers";
import { clientIp } from "@/lib/clientIp";
import {
  checkSetupLinkFlow,
  createFamilyFlow,
  type CreateFamilyResult,
  type SetupLinkStatus,
} from "@/lib/setupFlow";

export async function checkSetupLink(code: string): Promise<SetupLinkStatus> {
  return checkSetupLinkFlow(String(code ?? ""), clientIp(await headers()));
}

export async function createFamily(input: {
  code: string;
  familyName: string;
  displayName: string;
  password: string;
  passwordAgain: string;
}): Promise<CreateFamilyResult> {
  return createFamilyFlow(
    {
      code: String(input?.code ?? ""),
      familyName: String(input?.familyName ?? ""),
      displayName: String(input?.displayName ?? ""),
      password: String(input?.password ?? ""),
      passwordAgain: String(input?.passwordAgain ?? ""),
    },
    clientIp(await headers()),
  );
}
