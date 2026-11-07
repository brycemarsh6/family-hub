import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { listCookbooks } from "@/lib/assistant/cookbookReads";
import { cookbookTitleBody } from "@/lib/assistant/schemasCookbooks";
import { toWriteFailure } from "@/lib/assistant/errors";
import { toCookbook } from "@/lib/assistant/serializeCookbooks";
import { findOrCreateCookbookRow } from "@/lib/cookbookWrites";
import type { z } from "zod";

export const GET = assistantRoute({
  action: "cookbooks.list",
  handler: async () => ({ data: { cookbooks: await listCookbooks() } }),
});

export const POST = assistantRoute<Record<string, never>, z.output<typeof cookbookTitleBody>>({
  action: "cookbooks.create",
  body: cookbookTitleBody,
  handler: async ({ body, changes }) => {
    const result = await findOrCreateCookbookRow(body.title);
    if ("error" in result) throw toWriteFailure(result);
    if (result.created) {
      changes.push({
        model: "Cookbook",
        recordId: result.created.id,
        action: "create",
        summary: { title: result.created.title },
        before: null,
        after: result.created,
      });
    }
    return {
      status: result.created ? 201 : 200,
      data: {
        cookbook: toCookbook({ ...result.cookbook, _count: { recipes: result.recipeCount } }),
        created: result.created !== null,
      },
    };
  },
});
