"use server";

// Server Actions for putting checked-off shopping away into the inventory.
// Same rule as every other actions file (see groceries.ts's own header for
// the full explanation): these are real POST endpoints reachable directly,
// so every one starts with a getVerifiedSession() check.

import { revalidatePath } from "next/cache";
import { getVerifiedSession } from "@/lib/dal";
import {
  commitPutAway as writePutAway,
  PutAwayConflict,
  type PutAwayDecision,
} from "@/lib/putAway";
import {
  classifyForPutAway as readPutAwayClassification,
  type PutAwayClassification,
} from "@/lib/putAwayClassify";

function refreshPutAwayViews() {
  revalidatePath("/kitchen/shopping");
  revalidatePath("/kitchen/inventory");
  revalidatePath("/");
}

// The types moved to lib/putAway.ts and lib/putAwayClassify.ts with the logic; re-exported so the two
// components that import them from this file keep working unchanged.
export type {
  PutAwayMergeSuggestion,
  PutAwayNewItem,
  PutAwayClassification,
} from "@/lib/putAwayClassify";
export type { PutAwayDecision } from "@/lib/putAway";

export type PutAwayResult = { error?: string };

/**
 * Read-only preview of what "Put away" is about to do. The logic lives in
 * lib/putAway.ts (shared with the Assistant API); this is the session gate.
 */
export async function classifyForPutAway(): Promise<PutAwayClassification> {
  if (!(await getVerifiedSession())) return { knownCount: 0, newItems: [] };
  return readPutAwayClassification();
}

/** The actual put-away transaction — see lib/putAway.ts commitPutAway. */
export async function commitPutAway(
  decisions: PutAwayDecision[],
): Promise<PutAwayResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };
  try {
    await writePutAway(decisions);
  } catch (error) {
    // Rolled back: nothing was changed. The review UI shows `error` as-is.
    if (error instanceof PutAwayConflict) {
      return {
        error:
          "Someone else put the shopping away at the same moment — nothing was changed. Check the list and try again.",
      };
    }
    throw error;
  }
  refreshPutAwayViews();
  return {};
}
