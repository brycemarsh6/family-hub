import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { undoBody } from "@/lib/assistant/schemas";
import { undoRequest } from "@/lib/assistant/undoWrites";
import type { z } from "zod";

export const POST = assistantRoute<{ requestId: string }, z.output<typeof undoBody>>({
  action: "audit.undo",
  body: undoBody,
  handler: async ({ params, now, changes }) => {
    const { result, changes: logged } = await undoRequest(params.requestId, now);
    changes.push(...logged);
    return { data: result };
  },
});
