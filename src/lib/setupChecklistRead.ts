import "server-only";

import { db } from "@/lib/db";
import { isOwnerCopy } from "@/lib/copyConfig";
import { isGoogleConfigured } from "@/lib/google/oauth";
import { checklistDismissed, setupFinished, storesSaved } from "@/lib/householdSettingsRead";
import {
  checklistAllRequiredDone,
  setupChecklistItems,
  showSetupChecklist,
  type ChecklistItem,
} from "@/lib/setupChecklist";

// Gathers the facts for the "Finish setting up" card. No login check: the
// dashboard page passes the viewer's role it already verified.

/** Null when the card must not show (see showSetupChecklist), else its rows. */
export async function loadSetupChecklist(
  role: string,
): Promise<{ items: ChecklistItem[]; allRequiredDone: boolean } | null> {
  const owner = isOwnerCopy();
  // Cheap gate first so a non-admin or the owner's copy reads nothing else.
  if (owner || role !== "admin") return null;

  const [finished, dismissed, people, stores, pantry, tablet, linked] = await Promise.all([
    setupFinished(),
    checklistDismissed(),
    db.user.count({ where: { deactivatedAt: null, role: { not: "device" } } }),
    storesSaved(),
    db.pantryItem.findFirst({ select: { id: true } }),
    db.user.findFirst({ where: { deactivatedAt: null, role: "device" }, select: { id: true } }),
    db.linkedAccount.findFirst({ select: { id: true } }),
  ]);
  if (!showSetupChecklist({ isOwner: owner, setupFinished: finished, dismissed, role })) return null;

  const items = setupChecklistItems({
    hasOtherPeople: people > 1,
    storesSaved: stores,
    hasPantryItem: pantry !== null,
    hasTablet: tablet !== null,
    hasLinkedGoogle: linked !== null,
    googleConfigured: isGoogleConfigured(),
  });
  return { items, allRequiredDone: checklistAllRequiredDone(items) };
}
