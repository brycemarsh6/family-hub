"use server";

// Server Action for Plans & Goals' vision statements (mission 28). Like every
// action file, the export is a real public POST endpoint, so it opens with its
// own guard: signed in, then not a shared device. Validation and the board
// rules live in src/lib/visions.ts. A client names only "mine" or "together":
// "mine" always means the signed-in person, so nobody can name another
// person's board. Empty text clears the vision.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import { validateVisionInput, visionBoardKey } from "@/lib/visions";

export type VisionActionResult = { error?: string };

export async function saveVision(raw: unknown): Promise<VisionActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };
  if (user.isDevice) return { error: "A shared device can't change visions." };

  const parsed = validateVisionInput(raw);
  if ("error" in parsed) return { error: parsed.error };
  const { board, area, horizon, text } = parsed.ok;

  const boardKey = visionBoardKey(board === "mine" ? user.userId : null);
  const key = { boardKey_area_horizon: { boardKey, area, horizon } };
  if (text === "") {
    await db.visionStatement.deleteMany({ where: { boardKey, area, horizon } });
  } else {
    const ownerId = board === "mine" ? user.userId : null;
    await db.visionStatement.upsert({
      where: key,
      create: { boardKey, area, horizon, ownerId, text, updatedById: user.userId },
      update: { text, updatedById: user.userId },
    });
  }
  revalidatePath("/plans", "layout");
  return {};
}
