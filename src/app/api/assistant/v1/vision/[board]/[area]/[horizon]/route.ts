import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { ApiError, notFound, toWriteFailure } from "@/lib/assistant/errors";
import { winnieMayWriteBoard } from "@/lib/assistant/goalReads";
import { requireHouseholdPerson } from "@/lib/assistant/habitReads";
import { assistantOwnerId } from "@/lib/assistant/habitActorEnv";
import { BOARD_NEEDS_OWNER, BOARD_NOT_HERS, VISION_EMPTY, visionBody } from "@/lib/assistant/schemasGoals";
import { visionChange } from "@/lib/assistant/serializeGoals";
import { boardOwnerId, validateVisionInput, visionBoardKey } from "@/lib/visions";
import { loadVisionStatement } from "@/lib/visionsRead";
import { saveVision } from "@/lib/visionWrites";
import { invalid } from "@/lib/writeError";
import type { z } from "zod";

export const PUT = assistantRoute<{ board: string; area: string; horizon: string }, z.output<typeof visionBody>>({
  action: "vision.save",
  body: visionBody,
  handler: async ({ params, body, changes }) => {
    const ownerId = boardOwnerId(params.board);
    if (ownerId !== null) {
      await requireHouseholdPerson(ownerId);
      if (assistantOwnerId() === null) throw new ApiError(400, "validation", BOARD_NEEDS_OWNER);
    }
    // The app's rule (`canEditVision`): Together's board and the owner's, nobody else's.
    if (!winnieMayWriteBoard(ownerId)) throw new ApiError(403, "forbidden", BOARD_NOT_HERS);
    // Hill's H5: she writes a vision, she does not clear one.
    if (body.text.trim() === "") throw new ApiError(400, "validation", VISION_EMPTY);

    // The area and the horizon are the app's own words (`validateVisionInput`), checked before any lookup.
    const checked = validateVisionInput({ board: ownerId === null ? "together" : "mine", area: params.area, horizon: Number(params.horizon), text: body.text });
    if ("error" in checked) throw toWriteFailure(invalid(checked.error));
    const existing = await loadVisionStatement(visionBoardKey(ownerId), checked.ok.area, checked.ok.horizon);
    // The same words again change nothing: no write, no record.
    if (existing && existing.text === checked.ok.text) return { data: { vision: visionOf(existing) } };

    // Made by the bot, not a user: updatedById stays null.
    const result = await saveVision(winnieMayWriteBoard, { ownerId, area: params.area, horizon: params.horizon, text: body.text }, null);
    if ("error" in result) throw toWriteFailure(result);
    if (!result.after) throw notFound();
    changes.push(visionChange(result.before, result.after));
    return { status: result.before ? 200 : 201, data: { vision: visionOf(result.after) } };
  },
});

function visionOf(row: { boardKey: string; area: string; horizon: number; text: string }) {
  return { board: row.boardKey, area: row.area, horizon: row.horizon, text: row.text };
}
