import "server-only";

import { db } from "@/lib/db";
import { countHouseholdPeople } from "@/lib/householdPeople";
import { hasAnyLinkedAccount } from "@/lib/linkedCalendarsRead";
import { loadTabletStartPage } from "@/lib/startPageRead";
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
    countHouseholdPeople(),
    storesSaved(),
    db.pantryItem.findFirst({ select: { id: true } }),
    loadTabletStartPage(),
    hasAnyLinkedAccount(),
  ]);
  if (!showSetupChecklist({ isOwner: owner, setupFinished: finished, dismissed, role })) return null;

  const items = setupChecklistItems({
    hasOtherPeople: people > 1,
    storesSaved: stores,
    hasPantryItem: pantry !== null,
    hasTablet: tablet !== null,
    hasLinkedGoogle: linked,
    googleConfigured: isGoogleConfigured(),
  });
  return { items, allRequiredDone: checklistAllRequiredDone(items) };
}
