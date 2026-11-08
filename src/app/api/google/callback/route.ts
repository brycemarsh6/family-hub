import { cookies, headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { exchangeCode } from "@/lib/google/oauth";
import { STATE_COOKIE_NAME, oauthStatesMatch } from "@/lib/google/oauthState";
import { identityFromIdToken } from "@/lib/google/idToken";
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
// Only a Google error code in this shape may be copied into our redirect.
const GOOGLE_ERROR_CODE = /^[a-z_-]{1,40}$/;

/** The request's own origin from the host headers, or null if there is no host. */
async function requestOrigin(): Promise<string | null> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return null;
  const forwarded = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  const proto = forwarded === "http" || forwarded === "https" ? forwarded : isLocal ? "http" : "https";
  return `${proto}://${host}`;
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
    return back(GOOGLE_ERROR_CODE.test(googleError) ? `error=${googleError}` : "error=google");
  }

  const code = params.get("code");
  const callbackOrigin = await requestOrigin();
  if (!code || !callbackOrigin || !isTokenKeyConfigured()) return back("error=google");

  const exchange = await exchangeCode({ code, redirectUri: `${callbackOrigin}/api/google/callback` });
  if (!exchange.ok) {
    return back(exchange.reason === "no-refresh-token" ? "error=no-refresh-token" : "error=exchange");
  }

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

  // The account is saved. If the calendar list fails, the page just shows none.
  const listed = await listCalendars(exchange.accessToken);
  if (listed.ok) {
    try {
      await replaceCalendars(accountId, listed.calendars);
    } catch {
      // Same: keep the saved account, show no calendars.
    }
  }

  revalidatePath(PAGE);
  revalidatePath("/settings");
  return back(`linked=${encodeURIComponent(accountId)}`);
}
