"use server";

// Server Action for Plans & Goals' vision statements (mission 28). Like every
// action file, the export is a real public POST endpoint, so it opens with its
// own guard: signed in, then the board policy (`canEditVision`: a shared
// device never edits). Validation and the board rules live in
// src/lib/visions.ts. A client names only "mine" or "together": "mine" always
// means the signed-in person, so nobody can name another person's board. Empty
// text clears the vision.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import { isUniqueViolationError } from "@/lib/prismaErrors";
import { canEditVision, validateVisionInput, visionBoardKey } from "@/lib/visions";

export type VisionActionResult = { error?: string };

export async function saveVision(raw: unknown): Promise<VisionActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const parsed = validateVisionInput(raw);
  if ("error" in parsed) return { error: parsed.error };
  const { board, area, horizon, text } = parsed.ok;

  const ownerId = board === "mine" ? user.userId : null;
  if (!canEditVision(ownerId, user)) return { error: "A shared device can't change visions." };

  const boardKey = visionBoardKey(ownerId);
  if (text === "") {
    await db.visionStatement.deleteMany({ where: { boardKey, area, horizon } });
  } else {
    const key = { boardKey_area_horizon: { boardKey, area, horizon } };
    const create = { boardKey, area, horizon, ownerId, text, updatedById: user.userId };
    const update = { text, updatedById: user.userId };
    try {
      await db.visionStatement.upsert({ where: key, create, update });
    } catch (error) {
      // Two first saves at once: the other one created the row between our look and our write. Update it.
      if (!isUniqueViolationError(error)) throw error;
      await db.visionStatement.upsert({ where: key, create, update });
    }
  }
  revalidatePath("/plans", "layout");
  return {};
}
