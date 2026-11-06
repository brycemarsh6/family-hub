import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { auditQuery } from "@/lib/assistant/schemas";
import { listAudit } from "@/lib/assistant/audit";
import { decodeChangeSummary } from "@/lib/assistant/changeCopy";
import { undoneRequestIds } from "@/lib/assistant/undoWrites";

export const GET = assistantRoute({
  action: "audit.list",
  query: auditQuery,
  handler: async ({ query }) => {
    const rows = await listAudit({
      since: query.since ? new Date(query.since) : undefined,
      limit: query.limit,
      writesOnly: query.writesOnly,
    });
    const undone = await undoneRequestIds(rows.map((r) => r.id));
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
          undone: undone.has(r.id),
          changes: r.changes.map((c) => {
            const decoded = decodeChangeSummary(c.summary);
            return {
              model: c.model,
              recordId: c.recordId,
              action: c.action,
              summary: decoded.detail,
              undoable: decoded.version === 2,
            };
          }),
        })),
      },
    };
  },
});
