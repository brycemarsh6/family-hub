import "server-only";

import { db } from "@/lib/db";
import { SCREENSHOT_TYPE } from "@/lib/feedback";

// The one place a Feedback row is created. Used by the family's own Send
// feedback action and by the inbox route that takes relatives' reports. No
// sign-in check and no page refresh here: each caller does its own.

export async function createFeedbackRow(data: {
  authorId: string;
  authorName: string;
  message: string;
  pagePath: string;
  userAgent: string;
  viewport: string | null;
  screenshot: Uint8Array<ArrayBuffer> | null;
  sourceFamily?: string | null;
}) {
  const { screenshot, sourceFamily, ...rest } = data;
  return db.feedback.create({
    data: {
      ...rest,
      sourceFamily: sourceFamily ?? null,
      screenshot,
      screenshotType: screenshot ? SCREENSHOT_TYPE : null,
    },
  });
}
