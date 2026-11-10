import type { NextRequest } from "next/server";
import { isAuthorized } from "@/lib/cronAuth";
import { pullCalendars } from "@/lib/calendarEventPull";

// The daily calendar pull (mission 60). Vercel's cron calls this once a day
// (10:00 UTC, 3 or 4 AM in Denver) so tokens stay fresh and a revoked link is
// found even when nobody opens the Calendar. Its own gate is the CRON_SECRET
// bearer check, run before anything else. The answer carries counts only.

export const dynamic = "force-dynamic";
// Each calendar is pulled in turn; ask for the full minute.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  // Refresh's short lease: this is the day's one check, and the page may have pulled minutes ago.
  const result = await pullCalendars({ force: true });
  console.info(`calendar-pull changed=${result.changed} failed=${result.failed}`);
  return Response.json({ changed: result.changed, failed: result.failed });
}
