import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { listTags } from "@/lib/assistant/recipeReads";
import { tagCreateBody } from "@/lib/assistant/schemasRecipes";
import { toWriteFailure } from "@/lib/assistant/errors";
import { toTag } from "@/lib/assistant/serializeRecipes";
import { findOrCreateTagRow } from "@/lib/tagWrites";
import type { z } from "zod";

export const GET = assistantRoute({
  action: "tags.list",
  handler: async () => ({ data: { tags: await listTags() } }),
});

export const POST = assistantRoute<Record<string, never>, z.output<typeof tagCreateBody>>({
  action: "tags.create",
  body: tagCreateBody,
  handler: async ({ body, changes }) => {
    const result = await findOrCreateTagRow(body.name);
    if ("error" in result) throw toWriteFailure(result);
    if (result.created) {
      changes.push({
        model: "Tag",
        recordId: result.created.id,
        action: "create",
        summary: { name: result.created.name },
        before: null,
        after: result.created,
      });
    }
    return {
      status: result.created ? 201 : 200,
      data: { tag: toTag(result.tag, result.recipeCount), created: result.created !== null },
    };
  },
});
