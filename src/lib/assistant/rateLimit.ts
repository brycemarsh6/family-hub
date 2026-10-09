import "server-only";

// The DB-reading half of the Assistant API's rate limit. Counts AssistantRequest
// rows in the window — the same table the audit log uses, so there is no
// second store to keep in step.
//
// It must be called AFTER the caller's own row has been inserted
// (audit.startRequest), and it decides by INSERTION RANK: a request counts
// only the rows inserted at or before its own — createdAt earlier than its
// own, or equal with an id that sorts at or before its own (the id breaks
// millisecond ties) — itself included. Limited when that rank exceeds LIMIT.
//
// Why rank and not "count everything in the window": counting first and
// recording last lets N parallel requests all read the same stale count and
// pass (200 parallel calls got 199 through a limit of 120). Inserting first
// and counting ALL rows fixes that but makes a burst larger than LIMIT refuse
// everybody — every request inserts before any counts, so each sees >LIMIT
// rows — and a client that retries the whole batch livelocks. Ranking fixes
// both: the earliest LIMIT requests of a burst are served and the rest get 429,
// whatever order their counts happen to run in.
//
// Not exact under a race: a row that is mid-insert when a later request
// counts is not yet visible, so that later request can rank one lower than its
// true place and slip through, and a refused request's row is deleted, which
// can only lower later counts the same way. The error is bounded by the number
// of requests in flight at that instant — a few over LIMIT at worst (none seen
// in three 200-request bursts: exactly LIMIT served each time), never
// unbounded as before.
//
// Refused (429) callers delete their placeholder and unauthorised (401) calls
// never insert one, so a flood of either can neither fill the table nor extend
// its own lockout.
//
// Two cheap queries, no raw SQL: a COUNT, and the oldest row (only needed for
// the Retry-After figure, so it is skipped while under the limit).

import { db } from "@/lib/db";
import { evaluate, LIMIT, WINDOW_MS, type RateLimitStatus } from "./rateLimitPolicy";

export async function isRateLimited(
  now: Date,
  mine: { id: string; createdAt: Date },
): Promise<RateLimitStatus> {
  const since = new Date(now.getTime() - WINDOW_MS);
  // Counts the caller's own row too (its id equals mine.id), hence the `- 1`:
  // evaluate() wants "requests ranked before this one".
  const count =
    (await db.assistantRequest.count({
      where: {
        createdAt: { gt: since },
        OR: [
          { createdAt: { lt: mine.createdAt } },
          { createdAt: mine.createdAt, id: { lte: mine.id } },
        ],
      },
    })) - 1;
  if (count < LIMIT) return { limited: false };
  const oldest = await db.assistantRequest.findFirst({
    where: { createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  return evaluate(count, oldest?.createdAt ?? null, now);
}
