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

export type RecordRequestInput = {
  method: string;
  path: string;
  action: string;
  status: number;
  durationMs: number;
  ip: string | null;
  error: string | null;
  changes: ChangeInput[];
};

/** Request and its changes in one nested create — they land together or not at all. */
export async function recordRequest(input: RecordRequestInput): Promise<string> {
  const { changes, ...request } = input;
  const row = await db.assistantRequest.create({
    data: {
      ...request,
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
  return row.id;
}

/** Did the Assistant API itself create this record? Gates the bot's deletes. */
export async function didAssistantCreate(model: string, recordId: string): Promise<boolean> {
  const hit = await db.assistantChange.findFirst({
    where: { model, recordId, action: "create" },
    select: { id: true },
  });
  return hit !== null;
}

export async function listAudit(opts: { since?: Date; limit: number; writesOnly: boolean }) {
  return db.assistantRequest.findMany({
    where: {
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
