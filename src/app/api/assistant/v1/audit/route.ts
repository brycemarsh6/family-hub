import { assistantRoute } from "@/lib/assistant/route";
import { auditQuery } from "@/lib/assistant/schemas";
import { listAudit } from "@/lib/assistant/audit";

export const GET = assistantRoute({
  action: "audit.list",
  query: auditQuery,
  handler: async ({ query }) => {
    const rows = await listAudit({
      since: query.since ? new Date(query.since) : undefined,
      limit: query.limit,
      writesOnly: query.writesOnly,
    });
    return {
      data: {
        requests: rows.map((r) => ({
          id: r.id,
          at: r.createdAt.toISOString(),
          method: r.method,
          path: r.path,
          action: r.action,
          status: r.status,
          durationMs: r.durationMs,
          error: r.error,
          changes: r.changes.map((c) => ({
            model: c.model,
            recordId: c.recordId,
            action: c.action,
            summary: JSON.parse(c.summary) as unknown,
          })),
        })),
      },
    };
  },
});
