import "server-only";

// The Assistant API's audit log. One AssistantRequest row per call that got
// past authentication and the rate limit, with one AssistantChange row per
// record the call created, updated or deleted. Two readers: GET /audit, and
// didAssistantCreate — the rule that the bot may only delete what it made.

import { db } from "@/lib/db";

export type ChangeInput = {
  model: string;
  recordId: string;
  action: "create" | "update" | "delete";
  /** Plain object; stored as JSON text (the schema avoids provider JSON types). */
  summary: unknown;
};

export type StartRequestInput = {
  method: string;
  path: string;
  action: string;
  ip: string | null;
};

export type FinishRequestInput = {
  status: number;
  durationMs: number;
  error: string | null;
  changes: ChangeInput[];
};

/**
 * Status 0 means "in flight". The row is inserted BEFORE the handler runs
 * because it doubles as the rate limiter's counter (see rateLimit.ts): a
 * request that is counted only after it finishes lets a parallel burst all
 * pass the check together. finishRequest fills in the real outcome.
 */
export const IN_FLIGHT_STATUS = 0;

/** A status-0 row younger than this is a live request, not a dead one. */
const IN_FLIGHT_GRACE_MS = 5 * 60 * 1000;

export async function startRequest(input: StartRequestInput): Promise<string> {
  const row = await db.assistantRequest.create({
    data: { ...input, status: IN_FLIGHT_STATUS, durationMs: 0 },
    select: { id: true },
  });
  return row.id;
}

/** A refused (429) call leaves no trace: remove its placeholder. */
export async function discardRequest(id: string): Promise<void> {
  await db.assistantRequest.deleteMany({ where: { id } });
}

/** Fill in the outcome and create the changes, in one nested write. */
export async function finishRequest(id: string, input: FinishRequestInput): Promise<void> {
  const { changes, ...outcome } = input;
  await db.assistantRequest.update({
    where: { id },
    data: {
      ...outcome,
      changes: {
        create: changes.map((c) => ({
          model: c.model,
          recordId: c.recordId,
          action: c.action,
          summary: JSON.stringify(c.summary ?? null),
        })),
      },
    },
    select: { id: true },
  });
}

/** Did the Assistant API itself create this record? Gates the bot's deletes. */
export async function didAssistantCreate(model: string, recordId: string): Promise<boolean> {
  const hit = await db.assistantChange.findFirst({
    where: { model, recordId, action: "create" },
    select: { id: true },
  });
  return hit !== null;
}

/**
 * Rows still in flight (status 0, under five minutes old) are hidden — that
 * includes the very request asking. An OLDER status-0 row is shown as-is: the
 * process died mid-request, so its write may have landed with no change rows,
 * and hiding that would hide the one case the log exists to reveal.
 */
export async function listAudit(opts: { since?: Date; limit: number; writesOnly: boolean }) {
  const graceCutoff = new Date(Date.now() - IN_FLIGHT_GRACE_MS);
  return db.assistantRequest.findMany({
    where: {
      NOT: { status: IN_FLIGHT_STATUS, createdAt: { gt: graceCutoff } },
      ...(opts.since ? { createdAt: { gte: opts.since } } : {}),
      ...(opts.writesOnly ? { changes: { some: {} } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit,
    include: { changes: true },
  });
}

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Delete requests (and, by cascade, their changes) older than 30 days. */
export async function pruneAudit(now: Date = new Date()): Promise<number> {
  const { count } = await db.assistantRequest.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - RETENTION_MS) } },
  });
  return count;
}
