import "server-only";

import { db } from "@/lib/db";
import { SCREENSHOT_TYPE } from "@/lib/feedback";

// The only place the Feedback table is read. The list never carries
// screenshot bytes (a row can hold up to 400 KB of image); it says whether
// there is one, and the admin-only route loads the bytes for one report.
// Callers are admin pages and routes: they check the role themselves.

export type FeedbackListItem = {
  id: string;
  authorName: string;
  message: string;
  pagePath: string;
  userAgent: string | null;
  viewport: string | null;
  hasScreenshot: boolean;
  doneAt: Date | null;
  createdAt: Date;
};

/** Newest first. "new" is everything not marked done. */
export async function loadFeedbackList(status: "new" | "done"): Promise<FeedbackListItem[]> {
  const rows = await db.feedback.findMany({
    where: { doneAt: status === "new" ? null : { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      authorName: true,
      message: true,
      pagePath: true,
      userAgent: true,
      viewport: true,
      doneAt: true,
      createdAt: true,
      screenshotType: true,
    },
  });
  return rows.map(({ screenshotType, ...row }) => ({
    ...row,
    hasScreenshot: screenshotType !== null,
  }));
}

export async function countNewFeedback(): Promise<number> {
  return db.feedback.count({ where: { doneAt: null } });
}

/** The image for one report, or null when it has none (or the id is unknown). */
export async function loadFeedbackScreenshot(
  id: string,
): Promise<{ bytes: Uint8Array; type: string } | null> {
  const row = await db.feedback.findUnique({
    where: { id },
    select: { screenshot: true, screenshotType: true },
  });
  if (!row?.screenshot) return null;
  return { bytes: row.screenshot, type: row.screenshotType ?? SCREENSHOT_TYPE };
}
