import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { notFound } from "@/lib/assistant/errors";
import { readVision } from "@/lib/assistant/goalReads";
import { visionQuery } from "@/lib/assistant/schemasGoals";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { toVisionHorizon } from "@/lib/goalVocabulary";
import type { z } from "zod";

export const GET = assistantRoute<Record<string, never>, undefined, z.output<typeof visionQuery>>({
  action: "vision.get",
  query: visionQuery,
  handler: async ({ query, now }) => {
    const boards = await readVision({ board: query.board, horizon: toVisionHorizon(query.horizon) ?? undefined }, requireHouseholdToday(now));
    if (!boards) throw notFound();
    return { data: boards };
  },
});
