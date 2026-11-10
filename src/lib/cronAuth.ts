import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

// The one CRON_SECRET check, shared by every cron route (briefing, calendar
// pull). Run it before anything else in the route; proxy is only UX.

/** True only for `Authorization: Bearer <CRON_SECRET>`. Constant-time; a missing secret never matches. */
export function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("authorization");
  if (!provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}
