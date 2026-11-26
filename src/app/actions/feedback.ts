"use server";

// "Send feedback": any signed-in login (the wall tablet too) can send one
// report. Uses the null-returning guard because the sheet shows a failure
// inline (STRUCTURE.md, guard forms). The rules are in src/lib/feedback.ts.

import { after } from "next/server";
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
import { familyName } from "@/lib/feedbackForward";
import { feedbackForwardsToOwner, forwardFeedbackToOwner } from "@/lib/feedbackInbox";

export type SendFeedbackResult = { ok: true } | { ok: false; error: string };

export async function sendFeedback(input: {
  message: string;
  pagePath: string;
  userAgent: string;
  viewport: string;
  touch: boolean;
  screenshot: string | null;
  /** Undefined means true. False drops the image from the family's own copy. */
  keepScreenshot?: boolean;
  /** Only set by the sheet's switch (relatives' copies); off unless true. */
  shareScreenshotWithOwner?: boolean;
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
  const kept = input.keepScreenshot === false ? null : screenshot;
  const userAgent = input.touch === true && /Macintosh/i.test(agent) ? agent + TOUCH_STAMP : agent;

  const pagePath = normalizePagePath(input.pagePath);
  const viewport = normalizeViewport(input.viewport);

  try {
    await db.feedback.create({
      data: {
        authorId: user.userId,
        authorName: user.displayName,
        message: message.message,
        pagePath,
        userAgent,
        viewport: viewport || null,
        screenshot: kept,
        screenshotType: kept ? SCREENSHOT_TYPE : null,
      },
    });
  } catch {
    return { ok: false, error: "That didn't send. Check your connection and tap Send again." };
  }

  // A relative's copy also tells Bryce, after the family's own save is done.
  if (feedbackForwardsToOwner()) {
    const shared = input.shareScreenshotWithOwner === true && screenshot ? input.screenshot : null;
    after(() =>
      forwardFeedbackToOwner({
        family: familyName(process.env.FAMILY_NAME),
        authorName: user.displayName,
        message: message.message,
        pagePath,
        viewport,
        userAgent,
        screenshot: shared,
      }),
    );
  }
  return { ok: true };
}
