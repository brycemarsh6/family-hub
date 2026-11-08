"use server";

// Server Actions for Google-linked calendars (mission 55): start the link,
// change a calendar's direction, rename an account, unlink it. Parents and
// admins only; a device (the wall tablet) is refused. Every action opens
// with getVerifiedUser() and returns { error } for a refusal (STRUCTURE.md
// guard form a), since a thrown redirect would bounce the browser mid-tap.
// Changing or removing an account is owner-only: the owner is read fresh
// from the database each time, never trusted from the page. Every input is
// an untrusted claim and is checked here.

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getVerifiedUser, type VerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { SYNCED_CALENDARS_WORDS, isSyncDirection } from "@/lib/calendarSyncVocabulary";
import { googleAuthUrl, isGoogleConfigured, revokeToken } from "@/lib/google/oauth";
import { STATE_COOKIE_NAME, STATE_TTL_SECONDS, newOauthState } from "@/lib/google/oauthState";
import { isTokenKeyConfigured } from "@/lib/tokenCrypto";
import {
  renameLinkedAccount as writeRenameAccount,
  setCalendarDirection as writeCalendarDirection,
  unlinkAccount as writeUnlinkAccount,
} from "@/lib/linkedCalendarWrites";
import { loadAccountOwner, loadCalendarOwner, loadRefreshToken } from "@/lib/linkedCalendarsRead";

const NOT_SIGNED_IN = "Not signed in.";
const NOT_ALLOWED = "Only a parent or admin can change synced calendars.";
const GENERIC_ERROR = "Something went wrong. Try again.";
const MAX_LABEL_LENGTH = 60;

type ActionError = { error: string };

function refusal(user: VerifiedUser | null): ActionError | null {
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice || !MANAGER_ROLES.includes(user.role)) return { error: NOT_ALLOWED };
  return null;
}

function refresh() {
  revalidatePath("/settings/calendars");
  revalidatePath("/settings");
}

// Built the same way as the callback route's copy (src/app/api/google/callback/route.ts),
// so Google sees the identical redirect URI at both ends. Kept private in each
// file because neither may import from the other.
async function redirectUri(): Promise<string | null> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return null;
  const forwarded = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  const proto = forwarded === "http" || forwarded === "https" ? forwarded : isLocal ? "http" : "https";
  return `${proto}://${host}/api/google/callback`;
}

export async function startGoogleLink(): Promise<{ url: string } | ActionError> {
  const user = await getVerifiedUser();
  const refused = refusal(user);
  if (refused) return refused;

  if (!isGoogleConfigured() || !isTokenKeyConfigured()) {
    return { error: SYNCED_CALENDARS_WORDS.notConfigured };
  }
  const uri = await redirectUri();
  if (!uri) return { error: GENERIC_ERROR };

  const state = newOauthState();
  const url = googleAuthUrl({ state, redirectUri: uri });
  if (!url) return { error: SYNCED_CALENDARS_WORDS.notConfigured };

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_TTL_SECONDS,
    path: "/",
  });
  return { url };
}

export async function setCalendarDirection(
  calendarId: string,
  direction: string,
): Promise<{ ok: true } | ActionError> {
  const user = await getVerifiedUser();
  const refused = refusal(user);
  if (refused || !user) return refused ?? { error: NOT_SIGNED_IN };

  if (typeof calendarId !== "string" || calendarId === "" || !isSyncDirection(direction)) {
    return { error: GENERIC_ERROR };
  }
  const owner = await loadCalendarOwner(calendarId);
  if (!owner) return { error: GENERIC_ERROR };
  if (owner.userId !== user.userId) return { error: SYNCED_CALENDARS_WORDS.notYours(owner.name) };

  await writeCalendarDirection(calendarId, direction);
  refresh();
  return { ok: true };
}

export async function renameLinkedAccount(
  accountId: string,
  label: string,
): Promise<{ ok: true } | ActionError> {
  const user = await getVerifiedUser();
  const refused = refusal(user);
  if (refused || !user) return refused ?? { error: NOT_SIGNED_IN };

  if (typeof accountId !== "string" || accountId === "" || typeof label !== "string") {
    return { error: GENERIC_ERROR };
  }
  const owner = await loadAccountOwner(accountId);
  if (!owner) return { error: GENERIC_ERROR };
  if (owner.userId !== user.userId) return { error: SYNCED_CALENDARS_WORDS.notYours(owner.name) };

  await writeRenameAccount(accountId, label.trim().slice(0, MAX_LABEL_LENGTH));
  refresh();
  return { ok: true };
}

export async function unlinkAccount(accountId: string): Promise<{ ok: true } | ActionError> {
  const user = await getVerifiedUser();
  const refused = refusal(user);
  if (refused || !user) return refused ?? { error: NOT_SIGNED_IN };

  if (typeof accountId !== "string" || accountId === "") return { error: GENERIC_ERROR };
  const owner = await loadAccountOwner(accountId);
  if (!owner) return { error: GENERIC_ERROR };
  if (owner.userId !== user.userId) return { error: SYNCED_CALENDARS_WORDS.notYours(owner.name) };

  // Best effort: tell Google to forget us, but unlink even if that fails.
  try {
    const token = await loadRefreshToken(accountId);
    if (token) await revokeToken(token);
  } catch {
    // Ignored on purpose: the error could quote the token.
  }

  await writeUnlinkAccount(accountId);
  refresh();
  return { ok: true };
}
