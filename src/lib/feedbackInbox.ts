import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { isOwnerCopy } from "@/lib/copyConfig";
import { countForwardedFeedbackSince } from "@/lib/feedbackRead";
import {
  KEY_MIN_LENGTH,
  forwardConfig,
  inboxRateLimited,
  type  ForwardedFeedback,
} from "@/lib/feedbackForward";

// The server side of forwarding feedback to Bryce's copy (mission 90): the
// sender used by relatives' copies and the checks used by the receiving route.
// Settings are read at call time, never cached at module load.

const HOUR_MS = 60 * 60 * 1000;

/** True in a relative's copy that has both forwarding settings. */
export function feedbackForwardsToOwner(): boolean {
  return !isOwnerCopy() && forwardConfig(process.env) !== null;
}

/**
 * Posts one report to Bryce's copy. Never throws and never logs the key or
 * the message; the family's own save has already happened.
 */
export async function forwardFeedbackToOwner(payload: ForwardedFeedback): Promise<boolean> {
  const config = forwardConfig(process.env);
  if (!config) return false;
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.key}` },
      body: JSON.stringify(payload),
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.warn("[feedback-forward] owner copy answered", response.status);
    return response.ok;
  } catch {
    return false;
  }
}

/** Constant-time check of "Bearer <key>" against FEEDBACK_INBOX_KEY. */
export function inboxKeyMatches(header: string | null): boolean {
  const key = process.env.FEEDBACK_INBOX_KEY?.trim();
  if (!key || key.length < KEY_MIN_LENGTH || !header) return false;
  const a = createHash("sha256").update(header).digest();
  const b = createHash("sha256").update(`Bearer ${key}`).digest();
  return timingSafeEqual(a, b);
}

/** True when this family, or all families together, sent too many in the last hour. */
export async function isInboxRateLimited(family: string): Promise<boolean> {
  const since = new Date(Date.now() - HOUR_MS);
  return inboxRateLimited(await countForwardedFeedbackSince(family, since));
}
