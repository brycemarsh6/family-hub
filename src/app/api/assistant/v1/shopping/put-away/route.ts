import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { ApiError } from "@/lib/assistant/errors";
import { putAwayBody } from "@/lib/assistant/schemasShopping";
import { toPutAwayClassification, toPutAwayReport } from "@/lib/assistant/serializeShopping";
import { classifyForPutAway, commitPutAway, PutAwayNeedsReview } from "@/lib/putAway";
import type { z } from "zod";

export const POST = assistantRoute<Record<string, never>, z.output<typeof putAwayBody>>({
  action: "shopping.putAway",
  body: putAwayBody,
  handler: async ({ body, changes }) => {
    const { decisions, acceptDefaults } = body;

    // Nothing decided and no blanket consent: show what would need review,
    // and write nothing, unless every checked item is already known.
    if (!decisions && !acceptDefaults) {
      const classification = await classifyForPutAway();
      if (classification.newItems.length > 0) {
        return { data: { needsReview: true, classification: toPutAwayClassification(classification) } };
      }
    }

    let report;
    try {
      report = await commitPutAway(decisions ?? [], {
        createUnreviewed: acceptDefaults ? "defaults" : "refuse",
      });
    } catch (error) {
      if (error instanceof PutAwayNeedsReview) {
        const classification = await classifyForPutAway();
        throw new ApiError(
          409,
          "conflict",
          "Some checked items still need a decision before they can be put away.",
          {
            groceryItemIds: error.groceryItemIds,
            classification: toPutAwayClassification(classification),
          },
        );
      }
      throw error;
    }

    for (const item of report.items) {
      changes.push({
        model: "PantryItem",
        recordId: item.pantryItemId,
        action: item.action === "created" ? "create" : "update",
        summary: { via: "putAway", action: item.action, groceryItemId: item.groceryItemId, quantityAdded: item.quantityAdded },
      });
      changes.push({
        model: "GroceryItem",
        recordId: item.groceryItemId,
        action: "delete",
        summary: { via: "putAway", name: item.groceryName },
      });
    }
    return { data: toPutAwayReport(report) };
  },
});
