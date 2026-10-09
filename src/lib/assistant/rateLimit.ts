import "server-only";

// The DB-reading half of the Assistant API's rate limit. Counts AssistantRequest
// rows in the window — the same table the audit log uses, so there is no
// second store to keep in step.
//
// It must be called AFTER the caller's own row has been inserted
// (audit.startRequest) and counts that row too. That ordering is the whole
// point: counting first and recording last lets N parallel requests all read
// the same stale count and all pass (200 parallel calls got 199 through a
// limit of 120). Insert-then-count means each request sees every request that
// inserted before its own count ran. Near the boundary two concurrent callers
// can each see the other and both be refused when only one needed to be — it
// over-refuses, never under-refuses, which is the safe direction for a limiter.
//
// Refused (429) callers delete their placeholder and unauthorised (401) calls
// never insert one, so a flood of either can neither fill the table nor extend
// its own lockout.
//
// Two cheap queries, no raw SQL: a COUNT, and the oldest row (only needed for
// the Retry-After figure, so it is skipped while under the limit).

import { db } from "@/lib/db";
import { evaluate, LIMIT, WINDOW_MS, type RateLimitStatus } from "./rateLimitPolicy";

export async function isRateLimited(now: Date): Promise<RateLimitStatus> {
  const since = new Date(now.getTime() - WINDOW_MS);
  // Includes the caller's own already-inserted row, hence the `- 1`: evaluate()
  // wants "requests already recorded before this one".
  const count =
    (await db.assistantRequest.count({ where: { createdAt: { gt: since } } })) - 1;
  if (count < LIMIT) return { limited: false };
  const oldest = await db.assistantRequest.findFirst({
    where: { createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return evaluate(count, oldest?.createdAt ?? null, now);
}
