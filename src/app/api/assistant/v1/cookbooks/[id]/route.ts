import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { didAssistantCreate } from "@/lib/assistant/audit";
import { assistantFiledIds, getCookbook, getCookbookListItem } from "@/lib/assistant/cookbookReads";
import { ApiError, notFound, toWriteFailure } from "@/lib/assistant/errors";
import { cookbookTitleBody } from "@/lib/assistant/schemasCookbooks";
import { deleteCookbookRow, renameCookbookRow } from "@/lib/cookbookWrites";
import type { z } from "zod";

export const GET = assistantRoute<{ id: string }>({
  action: "cookbooks.get",
  handler: async ({ request, params }) => {
    const cookbook = await getCookbook(params.id, request.nextUrl.origin);
    if (!cookbook) throw notFound();
    return { data: { cookbook } };
  },
});

export const PATCH = assistantRoute<{ id: string }, z.output<typeof cookbookTitleBody>>({
  action: "cookbooks.rename",
  body: cookbookTitleBody,
  handler: async ({ params, body, changes }) => {
    const result = await renameCookbookRow(params.id, body.title);
    if ("error" in result) throw toWriteFailure(result);
    // The same title it already had: nothing was written, so nothing is recorded.
    if (result.before.title !== result.after.title) {
      changes.push({
        model: "Cookbook",
        recordId: params.id,
        action: "update",
        summary: { title: result.after.title },
        before: result.before,
        after: result.after,
      });
    }
    const cookbook = await getCookbookListItem(params.id);
    if (!cookbook) throw notFound();
    return { data: { cookbook } };
  },
});

export const DELETE = assistantRoute<{ id: string }>({
  action: "cookbooks.delete",
  handler: async ({ params, changes }) => {
    if (!(await getCookbookListItem(params.id))) throw notFound();
    if (!(await didAssistantCreate("Cookbook", params.id))) {
      throw new ApiError(403, "forbidden", "Winnie can only delete cookbooks she created.");
    }

    // The filings Winnie made, read before the transaction; the delete checks
    // them against the filings it sees under the cookbook's row lock, so a
    // filing that landed in between (not in this set) counts as the family's.
    const hers = await assistantFiledIds(params.id);
    const result = await deleteCookbookRow(params.id, (filings) => {
      if (filings.some((filing) => !hers.has(filing.id))) {
        // Thrown inside the transaction: nothing is deleted.
        throw new ApiError(
          409,
          "conflict",
          "The family has filed recipes in this cookbook, so it can't be deleted.",
        );
      }
      return null;
    });
    if (!result) throw notFound();
    if ("error" in result) throw toWriteFailure(result);

    for (const filing of result.filings) {
      changes.push({
        model: "CookbookRecipe",
        recordId: filing.id,
        action: "delete",
        summary: { recipeId: filing.recipeId, cookbookId: filing.cookbookId },
        before: filing,
        after: null,
      });
    }
    changes.push({
      model: "Cookbook",
      recordId: params.id,
      action: "delete",
      summary: { title: result.cookbook.title },
      before: result.cookbook,
      after: null,
    });
    return { data: { deleted: true, unfiled: result.filings.length } };
  },
});
