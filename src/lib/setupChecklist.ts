// The "Finish setting up" card's rules: its five rows, when the required ones
// are done, and who sees the card. Pure, so it is tested without a database.
// The facts come from setupChecklistRead.ts; the words are in
// welcomeVocabulary.ts.

import type { Role } from "@/lib/constants";
import { CHECKLIST_WORDS } from "@/lib/welcomeVocabulary";

export type ChecklistFacts = {
  /** More than one active, non-device person exists (the admin plus someone). */
  hasOtherPeople: boolean;
  storesSaved: boolean;
  hasPantryItem: boolean;
  hasTablet: boolean;
  hasLinkedGoogle: boolean;
  googleConfigured: boolean;
};

export type ChecklistItem = {
  id: "family" | "stores" | "pantry" | "tablet" | "google";
  label: string;
  href: string;
  optional: boolean;
  done: boolean;
};

/** The rows in the mock's order. The Google row is left out when Google isn't switched on. */
export function setupChecklistItems(facts: ChecklistFacts): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { id: "family", label: CHECKLIST_WORDS.addFamily, href: "/settings/family", optional: false, done: facts.hasOtherPeople },
    { id: "stores", label: CHECKLIST_WORDS.pickStores, href: "/settings/stores", optional: false, done: facts.storesSaved },
    { id: "pantry", label: CHECKLIST_WORDS.addPantry, href: "/kitchen/inventory", optional: false, done: facts.hasPantryItem },
    { id: "tablet", label: CHECKLIST_WORDS.wallTablet, href: "/settings/family", optional: true, done: facts.hasTablet },
  ];
  if (facts.googleConfigured) {
    items.push({
      id: "google",
      label: CHECKLIST_WORDS.linkGoogle,
      href: "/settings/calendars",
      optional: true,
      done: facts.hasLinkedGoogle,
    });
  }
  return items;
}

/** True once every required (not optional) row is done. */
export function checklistAllRequiredDone(items: readonly ChecklistItem[]): boolean {
  return items.filter((item) => !item.optional).every((item) => item.done);
}

/** Who sees the card: admins only, on a copy that ran setup, not hidden yet, never on the owner's copy. */
export function showSetupChecklist(params: {
  isOwner: boolean;
  setupFinished: boolean;
  dismissed: boolean;
  role: Role | string;
}): boolean {
  return !params.isOwner && params.setupFinished && !params.dismissed && params.role === "admin";
}
