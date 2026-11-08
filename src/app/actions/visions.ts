"use server";

// Server Action for Plans & Goals' vision statements (mission 28). Like every
// action file, the export is a real public POST endpoint, so it opens with its
// own guard: signed in, then the board policy (`canEditVision`: a shared
// device never edits). Validation and the board rules live in
// src/lib/visions.ts. A client names only "mine" or "together": "mine" always
// means the signed-in person, so nobody can name another person's board. Empty
// text clears the vision. The write itself lives in src/lib/visionWrites.ts
// (mission 50), shared with the Assistant API.

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/dal";
import { canEditVision, validateVisionInput } from "@/lib/visions";
import { saveVision as saveVisionRow } from "@/lib/visionWrites";

export type VisionActionResult = { error?: string };

export async function saveVision(raw: unknown): Promise<VisionActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const parsed = validateVisionInput(raw);
  if ("error" in parsed) return { error: parsed.error };
  const { board, area, horizon, text } = parsed.ok;

  const ownerId = board === "mine" ? user.userId : null;
  const result = await saveVisionRow((owner) => canEditVision(owner, user), { ownerId, area, horizon, text }, user.userId);
  if ("error" in result) return { error: result.error };

  revalidatePath("/plans", "layout");
  return {};
}
