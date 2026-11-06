"use server";

// "Send feedback": any signed-in login (the wall tablet too) can send one
// report. Uses the null-returning guard because the sheet shows a failure
// inline (STRUCTURE.md, guard forms). The rules are in src/lib/feedback.ts.

import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import {
  SCREENSHOT_TYPE,
  TOUCH_STAMP,
  USER_AGENT_MAX,
  decodeScreenshot,
  normalizeMessage,
  normalizePagePath,
  normalizeViewport,
} from "@/lib/feedback";

export type SendFeedbackResult = { ok: true } | { ok: false; error: string };

export async function sendFeedback(input: {
  message: string;
  pagePath: string;
  userAgent: string;
  viewport: string;
  touch: boolean;
  screenshot: string | null;
}): Promise<SendFeedbackResult> {
  const user = await getVerifiedUser();
  if (!user) return { ok: false, error: "Please sign in again, then send your feedback." };
  // A hand-made POST can send anything; a malformed body is a plain failure.
  if (input === null || typeof input !== "object") {
    return { ok: false, error: "That didn't send. Check your connection and tap Send again." };
  }

  const message = normalizeMessage(input.message);
  if (!message.ok) return message;

  const screenshot = decodeScreenshot(input.screenshot);
  const agent = String(input.userAgent ?? "").slice(0, USER_AGENT_MAX - TOUCH_STAMP.length);
  const userAgent = input.touch === true && /Macintosh/i.test(agent) ? agent + TOUCH_STAMP : agent;

  try {
    await db.feedback.create({
      data: {
        authorId: user.userId,
        authorName: user.displayName,
        message: message.message,
        pagePath: normalizePagePath(input.pagePath),
        userAgent,
        viewport: normalizeViewport(input.viewport) || null,
        screenshot,
        screenshotType: screenshot ? SCREENSHOT_TYPE : null,
      },
    });
  } catch {
    return { ok: false, error: "That didn't send. Check your connection and tap Send again." };
  }
  return { ok: true };
}
