import "server-only";

// The write on a Vision statement (mission 50, C1): save one statement for a
// board, area and horizon. The rules `src/app/actions/visions.ts` used to
// hold, in one `server-only` lib module with NO session check and NO
// `revalidatePath` (same split as `goalWrites.ts`). Empty text deletes the row,
// the app's way to clear a vision; a caller that must not clear one (the
// Assistant API) refuses empty text before calling.
//
// The caller names the board by its owner (`null` is Together), and its
// `guard` judges that owner (`canEditVision`). The write returns whole-row
// copies of the statement as it was and as it is now, read inside the same
// transaction, or a `WriteError`.

import { db } from "@/lib/db";
import type { Prisma, VisionStatement } from "@/generated/prisma/client";
import { isUniqueViolationError } from "./prismaErrors";
import { validateVisionInput, visionBoardKey } from "./visions";
import { atomically } from "./habits/participantWrites";
import { invalid, type WriteError } from "./writeError";

export const VISION_NOT_ALLOWED = "A shared device can't change visions.";

/** The caller's access test on the board: true when its owner's statements may be changed. */
export type VisionGuard = (ownerId: string | null) => boolean;

export async function saveVision(
  guard: VisionGuard,
  input: { ownerId: string | null; area: unknown; horizon: unknown; text: unknown },
  updatedById: string | null,
  client: Prisma.TransactionClient = db,
): Promise<{ before: VisionStatement | null; after: VisionStatement | null } | WriteError> {
  const { ownerId } = input;
  const parsed = validateVisionInput({ board: ownerId === null ? "together" : "mine", area: input.area, horizon: input.horizon, text: input.text });
  if ("error" in parsed) return invalid(parsed.error);
  const { area, horizon, text } = parsed.ok;
  if (!guard(ownerId)) return invalid(VISION_NOT_ALLOWED);

  const boardKey = visionBoardKey(ownerId);
  const key = { boardKey_area_horizon: { boardKey, area, horizon } };
  const attempt = () =>
    atomically(client, async (tx) => {
      const before = await tx.visionStatement.findUnique({ where: key });
      if (text === "") {
        await tx.visionStatement.deleteMany({ where: { boardKey, area, horizon } });
        return { before, after: null };
      }
      const after = await tx.visionStatement.upsert({
        where: key,
        create: { boardKey, area, horizon, ownerId, text, updatedById },
        update: { text, updatedById },
      });
      return { before, after };
    });
  try {
    return await attempt();
  } catch (error) {
    // Two first saves at once: the other one created the row between our look and our write. Update it.
    if (!isUniqueViolationError(error)) throw error;
    return attempt();
  }
}
