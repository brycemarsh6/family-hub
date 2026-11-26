// The pure rules for forwarding feedback from a relative's copy to Bryce's
// (mission 90). No database and no Next imports, so it is testable alone
// (feedbackForward.test.ts). The sending and receiving live in
// src/lib/feedbackInbox.ts and src/app/api/feedback-inbox/route.ts.

import {
  USER_AGENT_MAX,
  normalizeMessage,
  normalizePagePath,
  normalizeViewport,
} from "./feedback";

/** The most bytes the inbox route reads from one request (a screenshot rides inside). */
export const FORWARD_BODY_MAX_BYTES = 600 * 1024;
export const FAMILY_NAME_MAX = 60;
export const AUTHOR_NAME_MAX = 60;
export const FORWARD_PER_FAMILY_PER_HOUR = 10;
export const FORWARD_TOTAL_PER_HOUR = 30;

/** The shortest key either side accepts. */
export const KEY_MIN_LENGTH = 32;
/** The authorId on rows that arrived from a relative's copy. */
export const FORWARDED_AUTHOR_ID = "forwarded";

// Control and format characters (NUL, right-to-left override, zero-width
// space and the like) are invisible, so they have no place in a name or text.
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;

export type ForwardedFeedback = {
  family: string;
  authorName: string;
  message: string;
  pagePath: string;
  userAgent: string;
  viewport: string;
  screenshot: string | null;
};

/** Both settings present, a safe address and a long enough key, or null (forwarding off). */
export function forwardConfig(
  env: Record<string, string | undefined>,
): { url: string; key: string } | null {
  const url = env.FEEDBACK_FORWARD_URL?.trim() ?? "";
  const key = env.FEEDBACK_FORWARD_KEY?.trim() ?? "";
  if (!url || !key || key.length < KEY_MIN_LENGTH) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && local)) return null;
  return { url, key };
}

/** The family's name as Bryce sees it: tidy spacing, capped, or a plain fallback. */
export function familyName(raw: string | undefined): string {
  return cleanName(raw, FAMILY_NAME_MAX) ?? "Unnamed family";
}

function cleanName(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(INVISIBLE, "").replace(/\s+/g, " ").trim().slice(0, max).trim();
  return name || null;
}

function stripNul(text: string): string {
  return text.replace(/\u0000/g, "");
}

/** Checks the JSON a relative's copy sent. Anything off is a plain not-ok. */
export function parseForwardedFeedback(
  raw: unknown,
): { ok: true; value: ForwardedFeedback } | { ok: false } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return { ok: false };
  const body = raw as Record<string, unknown>;
  const family = cleanName(body.family, FAMILY_NAME_MAX);
  const authorName = cleanName(body.authorName, AUTHOR_NAME_MAX);
  if (!family || !authorName) return { ok: false };
  // Postgres refuses NUL in text, so it goes before anything is saved.
  const message = normalizeMessage(typeof body.message === "string" ? stripNul(body.message) : body.message);
  if (!message.ok) return { ok: false };
  if (body.screenshot !== undefined && body.screenshot !== null && typeof body.screenshot !== "string") {
    return { ok: false };
  }
  const userAgent = typeof body.userAgent === "string" ? stripNul(body.userAgent).slice(0, USER_AGENT_MAX) : "";
  return {
    ok: true,
    value: {
      family,
      authorName,
      message: message.message,
      pagePath: normalizePagePath(body.pagePath),
      userAgent,
      viewport: normalizeViewport(body.viewport),
      screenshot: typeof body.screenshot === "string" ? body.screenshot : null,
    },
  };
}

/** True when this hour's forwarded reports are already at either limit. */
export function inboxRateLimited(counts: { family: number; total: number }): boolean {
  return counts.family >= FORWARD_PER_FAMILY_PER_HOUR || counts.total >= FORWARD_TOTAL_PER_HOUR;
}
