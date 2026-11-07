import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound } from "@/lib/assistant/errors";
import { cookbookActionBody } from "@/lib/assistant/schemasCookbooks";
import { toCookbookShareUrl } from "@/lib/assistant/serializeCookbooks";
import { shareCookbookRow, stopSharingCookbookRow } from "@/lib/cookbookWrites";
import type { z } from "zod";

export const POST = assistantRoute<{ id: string }, z.output<typeof cookbookActionBody>>({
  action: "cookbooks.share",
  body: cookbookActionBody,
  handler: async ({ request, params, changes }) => {
    const result = await shareCookbookRow(params.id);
    if (!result) throw notFound();
    // Already shared: the token is kept and nothing was written.
    if (result.changed) {
      changes.push({
        model: "Cookbook",
        recordId: params.id,
        action: "update",
        summary: { sharing: true },
        before: result.before,
        after: result.after,
      });
    }
    return { data: { shareUrl: toCookbookShareUrl(request.nextUrl.origin, result.after.shareToken) } };
  },
});

export const DELETE = assistantRoute<{ id: string }>({
  action: "cookbooks.stopSharing",
  handler: async ({ params, changes }) => {
    const result = await stopSharingCookbookRow(params.id);
    if (!result) throw notFound();
    // Not shared to begin with: nothing changed, so nothing is recorded.
    if (result.before.shareToken !== null) {
      changes.push({
        model: "Cookbook",
        recordId: params.id,
        action: "update",
        summary: { sharing: false },
        before: result.before,
        after: result.after,
      });
    }
    return { data: { shareUrl: null } };
  },
});
