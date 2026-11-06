import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { undoBody } from "@/lib/assistant/schemas";
import { ApiError } from "@/lib/assistant/errors";
import { undoPathFor } from "@/lib/assistant/undoPlan";
import { undoRequest } from "@/lib/assistant/undoWrites";
import type { z } from "zod";

export const POST = assistantRoute<{ requestId: string }, z.output<typeof undoBody>>({
  action: "audit.undo",
  body: undoBody,
  handler: async ({ request, params, now, changes }) => {
    // The already-undone check looks the request up by its exact path, so an
    // encoded spelling of the same URL would dodge it.
    if (request.nextUrl.pathname !== undoPathFor(params.requestId)) {
      throw new ApiError(400, "validation", "The request id must be written plainly in the path.");
    }
    const { result, changes: logged } = await undoRequest(params.requestId, now);
    changes.push(...logged);
    return { data: result };
  },
});
