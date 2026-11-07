"use server";

// Server Actions for cookbooks. Same rule as recipes.ts/pantry.ts/groceries.ts:
// a Server Action is a real public POST endpoint, reachable directly, so
// every one of these opens with a getVerifiedSession() check.

import { revalidatePath } from "next/cache";
import { getVerifiedSession, getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import {
  COOKBOOK_MISSING,
  createCookbookRow,
  deleteCookbookRow,
  fileRecipeRow,
  renameCookbookRow,
  shareCookbookRow,
  stopSharingCookbookRow,
  unfileRecipeRow,
} from "@/lib/cookbookWrites";

function refreshCookbookViews(cookbookId?: string) {
  revalidatePath("/kitchen/cooking/recipes");
  if (cookbookId) {
    revalidatePath(`/kitchen/cooking/recipes/cookbooks/${cookbookId}`);
  }
}

export type CookbookResult = { id?: string; error?: string };

/** Title -> straight into the new empty book, no second confirmation step. */
export async function createCookbook(title: string): Promise<CookbookResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const result = await createCookbookRow(title);
  if ("error" in result) return { error: result.error };
  refreshCookbookViews();
  return { id: result.cookbook.id };
}

export async function renameCookbook(
  cookbookId: string,
  title: string,
): Promise<CookbookResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const result = await renameCookbookRow(cookbookId, title);
  if ("error" in result) return { error: result.error };
  refreshCookbookViews(cookbookId);
  return { id: cookbookId };
}

export type DeleteCookbookResult = { error?: string };

/**
 * Unfiles every recipe in this cookbook — the CookbookRecipe join rows
 * cascade-delete with it — but never touches the recipes themselves. This is
 * one of the two deliberate breaks of the house's single-tap-delete rule
 * (the other is deleting a tag, in C2): both silently touch many rows'
 * relationships at once, so the client confirms with a real count before
 * calling this, via ConfirmSheet.
 */
export async function deleteCookbook(
  cookbookId: string,
): Promise<DeleteCookbookResult> {
  // Gated to admin/parent — deleting a cookbook (even though it only
  // unfiles recipes rather than deleting them) is management, not
  // participation.
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  const result = await deleteCookbookRow(cookbookId);
  if (!result) return { error: COOKBOOK_MISSING.error };
  if ("error" in result) return { error: result.error };
  refreshCookbookViews();
  return {};
}

export type CookbookMembershipResult = { error?: string };

/**
 * Idempotent — the (cookbookId, recipeId) unique constraint means filing an
 * already-filed recipe again is a harmless no-op rather than a duplicate row
 * or a thrown error.
 */
export async function addRecipeToCookbook(
  cookbookId: string,
  recipeId: string,
): Promise<CookbookMembershipResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  const result = await fileRecipeRow(cookbookId, recipeId);
  if ("error" in result) return { error: result.error };
  refreshCookbookViews(cookbookId);
  return {};
}

/** Unfiles one recipe from one cookbook — never touches the recipe itself. */
export async function removeRecipeFromCookbook(
  cookbookId: string,
  recipeId: string,
): Promise<CookbookMembershipResult> {
  if (!(await getVerifiedSession())) return { error: "Not signed in." };

  await unfileRecipeRow(cookbookId, recipeId);
  refreshCookbookViews(cookbookId);
  return {};
}

export type CookbookShareResult = { shareToken?: string | null; error?: string };

/**
 * Share a cookbook — the recipe-share machinery (R4) pointed at a list, per
 * the Recipes v2 plan's own words. Same shape as shareRecipe in recipes.ts:
 * 32 bytes from crypto.randomBytes (256 bits, not sequential, not derived
 * from the cookbook id), and idempotent — re-sharing an already-shared
 * cookbook returns the existing token rather than rotating it, so tapping
 * Share twice doesn't silently break a link someone already has.
 *
 * The link follows the cookbook's *current* contents, not a snapshot —
 * filing a new recipe into an already-shared book extends what the viewer
 * sees. That's the right behavior, but it's why the share sheet has to say
 * so plainly rather than let someone assume a link is frozen at share time.
 */
export async function shareCookbook(cookbookId: string): Promise<CookbookShareResult> {
  // Gated to admin/parent — sharing publishes household data to the public
  // internet, which is management, not participation.
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  const result = await shareCookbookRow(cookbookId);
  if (!result) return { error: COOKBOOK_MISSING.error };
  // Already shared: the existing token comes back and nothing is written.
  if (result.changed) refreshCookbookViews(cookbookId);
  return { shareToken: result.after.shareToken };
}

/**
 * Stop sharing: null the token, which kills the old link immediately —
 * anyone holding it gets a 404 from then on, since the public page looks a
 * cookbook up *by* that value.
 */
export async function stopSharingCookbook(
  cookbookId: string,
): Promise<CookbookShareResult> {
  // Gated to admin/parent — same reasoning as shareCookbook above.
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  const result = await stopSharingCookbookRow(cookbookId);
  if (!result) return { error: COOKBOOK_MISSING.error };
  refreshCookbookViews(cookbookId);
  return { shareToken: null };
}
