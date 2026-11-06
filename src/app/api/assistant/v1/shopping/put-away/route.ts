import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { ApiError } from "@/lib/assistant/errors";
import { putAwayBody } from "@/lib/assistant/schemasShopping";
import { toPutAwayClassification, toPutAwayReport } from "@/lib/assistant/serializeShopping";
import { commitPutAway, PutAwayConflict, PutAwayNeedsReview } from "@/lib/putAway";
import { classifyForPutAway } from "@/lib/putAwayClassify";
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
      if (error instanceof PutAwayConflict) {
        throw new ApiError(
          409,
          "conflict",
          "The shopping list changed while putting it away (an item was put away or un-ticked somewhere else). Nothing was changed; check the list and try again.",
        );
      }
      throw error;
    }

    // One change per pantry row (a row two lines folded into records the
    // first `before` and the last `after`), then one per grocery row removed.
    for (const copy of report.pantryCopies) {
      const first = copy.lines[0];
      changes.push({
        model: "PantryItem",
        recordId: copy.pantryItemId,
        action: copy.before === null ? "create" : "update",
        summary: {
          via: "putAway",
          action: first.action,
          groceryItemId: first.groceryItemId,
          quantityAdded: copy.lines.reduce((sum, line) => sum + line.quantityAdded, 0),
          ...(copy.lines.length > 1 ? { lines: copy.lines.length } : {}),
        },
        before: copy.before,
        after: copy.after,
      });
    }
    for (const grocery of report.groceryCopies) {
      changes.push({
        model: "GroceryItem",
        recordId: grocery.id,
        action: "delete",
        summary: { via: "putAway", name: grocery.name },
        before: grocery,
        after: null,
      });
    }
    return { data: toPutAwayReport(report) };
  },
});
