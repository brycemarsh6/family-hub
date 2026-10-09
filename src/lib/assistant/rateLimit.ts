import "server-only";

// The DB-reading half of the Assistant API's rate limit. Counts recorded
// AssistantRequest rows in the window — the same table the audit log uses, so
// there is no second store to keep in step. Refused (429) and unauthorised
// (401) calls are deliberately not recorded (route.ts), so a flood of them
// can neither fill the table nor extend its own lockout.
//
// Two cheap queries, no raw SQL: a COUNT, and the oldest row (only needed for
// the Retry-After figure, so it is skipped while under the limit).

import { db } from "@/lib/db";
import { evaluate, LIMIT, WINDOW_MS, type RateLimitStatus } from "./rateLimitPolicy";

export async function isRateLimited(now: Date): Promise<RateLimitStatus> {
  const since = new Date(now.getTime() - WINDOW_MS);
  const count = await db.assistantRequest.count({ where: { createdAt: { gt: since } } });
  if (count < LIMIT) return { limited: false };
  const oldest = await db.assistantRequest.findFirst({
    where: { createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return evaluate(count, oldest?.createdAt ?? null, now);
}
