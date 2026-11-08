import { cookies, headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { exchangeCode } from "@/lib/google/oauth";
import { STATE_COOKIE_NAME, oauthStatesMatch } from "@/lib/google/oauthState";
import { identityFromIdToken } from "@/lib/google/idToken";
import { googleRedirectUri, requestOriginFrom } from "@/lib/google/redirectUri";
import { hasCalendarScopes } from "@/lib/google/scopes";
import { toLinkErrorCode } from "@/lib/calendarSyncVocabulary";
import { listCalendars } from "@/lib/google/calendarApi";
import { encryptSecret, isTokenKeyConfigured } from "@/lib/tokenCrypto";
import { replaceCalendars, saveLinkedAccount } from "@/lib/linkedCalendarWrites";

// Google sends the browser back here after the person says yes or no. The
// proxy lets the path through without a Marshee session cookie (it is in
// PUBLIC_ROUTES), so this handler is its own gate: signed-in manager first,
// then the one-time state cookie. Every outcome is a redirect back to the
// Synced calendars page. No token, code or Google response is logged or put
// in a URL; failures become short fixed words in ?error=.

export const dynamic = "force-dynamic";

const PAGE = "/settings/calendars";

/** The request's own origin from the host headers, or null if there is no host. */
async function requestOrigin(): Promise<string | null> {
  const h = await headers();
  return requestOriginFrom(h.get("host"), h.get("x-forwarded-proto"));
}

export async function GET(request: NextRequest) {
  const origin = (await requestOrigin()) ?? request.nextUrl.origin;
  const back = (query: string) => NextResponse.redirect(new URL(`${PAGE}?${query}`, origin));

  // Read the state cookie and clear it straight away, so a state value works once.
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE_NAME)?.value;
  cookieStore.delete(STATE_COOKIE_NAME);

  const user = await getVerifiedUser();
  if (!user || user.isDevice || !MANAGER_ROLES.includes(user.role)) return back("error=signin");

  const params = request.nextUrl.searchParams;
  if (!oauthStatesMatch(savedState, params.get("state"))) return back("error=state");

  const googleError = params.get("error");
  if (googleError !== null) {
    return back(`error=${toLinkErrorCode(googleError)}`);
  }

  const code = params.get("code");
  const callbackOrigin = await requestOrigin();
  if (!code || !callbackOrigin || !isTokenKeyConfigured()) return back("error=google");

  const exchange = await exchangeCode({ code, redirectUri: googleRedirectUri(callbackOrigin) });
  if (!exchange.ok) {
    return back(exchange.reason === "no-refresh-token" ? "error=no-refresh-token" : "error=exchange");
  }

  // A narrower grant (a box unticked) must not overwrite a good saved token.
  if (!hasCalendarScopes(exchange.scope)) return back("error=calendars");

  const identity = identityFromIdToken(exchange.idToken);
  if (!identity) return back("error=exchange");

  let accountId: string;
  try {
    const saved = await saveLinkedAccount({
      userId: user.userId,
      sub: identity.sub,
      email: identity.email,
      scopes: exchange.scope,
      encryptedRefreshToken: encryptSecret(exchange.refreshToken),
    });
    accountId = saved.id;
  } catch {
    // Dropped on purpose: the error could quote the token.
    return back("error=google");
  }

  // The account is saved and stays saved if the calendar list fails.
  const listed = await listCalendars(exchange.accessToken);
  if (!listed.ok) return back("error=calendars");
  try {
    await replaceCalendars(accountId, listed.calendars);
  } catch {
    return back("error=calendars");
  }

  return back(`linked=${encodeURIComponent(accountId)}`);
}
