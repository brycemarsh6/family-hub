import "server-only";
import { aiUpgradeUrl, type AiAllowanceError } from "@/lib/aiMeter";
import type { AiBlockReason } from "@/lib/aiMeterPolicy";
import { AI_BLOCKED_TITLE, resetsLabel } from "@/lib/aiMeterVocabulary";

// What a Server Action hands the screen when `meteredCreate` refuses an AI
// call (mission 89). Plain data, so it crosses to the client. Only an admin
// gets the Upgrade link; everyone else gets the ask-an-admin line.

export type AiBlocked = {
  reason: AiBlockReason;
  /** "December 1" */
  resetsLabel: string;
  upgradeUrl: string | null;
  isAdmin: boolean;
};

export function buildAiBlocked(error: AiAllowanceError, role: string): AiBlocked {
  const isAdmin = role === "admin";
  return {
    reason: error.reason,
    resetsLabel: resetsLabel(error.resetsOn),
    upgradeUrl: isAdmin ? aiUpgradeUrl() : null,
    isAdmin,
  };
}

/** The whole result an action returns for a blocked call. */
export function aiBlockedResult(
  error: AiAllowanceError,
  role: string,
): { error: string; aiBlocked: AiBlocked } {
  return { error: AI_BLOCKED_TITLE, aiBlocked: buildAiBlocked(error, role) };
}
