import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

// Bounces signed-out visitors to the login page before a protected page ever
// renders. In Next 16 this file is called `proxy.ts` — it was `middleware.ts`
// in earlier versions, so older tutorials will name it differently.
//
// IMPORTANT: this is NOT what secures the data. It's an optimistic check for
// the sake of the experience — it reads the cookie and nothing else. The real
// protection is getVerifiedSession() inside every Server Action (see
// src/lib/dal.ts), because a Server Action is a public POST endpoint that can
// be called directly without ever loading a page. The Next.js auth guide is
// blunt about it: proxy "should not be your only line of defense".
//
// Deliberately inverted from the shape the docs use. Their example lists the
// PROTECTED routes; this lists the PUBLIC ones and protects everything else.
// With an allowlist of protected routes, every new page added later is public
// until someone remembers to list it — a page gets forgotten and quietly
// leaks. This way forgetting means a page is locked, which is the failure you
// notice immediately instead of the one you never find out about.

// "Public" here means "not gated by the family-password cookie" — NOT
// "unauthenticated". /api/voice is in this list because Alexa and Siri have no
// way to sign in and hold a session cookie; it authenticates itself with a
// separate shared token, checked as the first thing it does (see
// src/app/api/voice/route.ts). Without this entry the proxy would bounce every
// voice request to /login and the endpoint could never run.
const PUBLIC_ROUTES = ["/login", "/api/voice"];

// Shared recipes are the one case that can't be an exact match: the URL
// carries a per-recipe token (/share/recipe/<token>), so the path is
// different every time. Same principle as /api/voice — the route is
// reachable without a session cookie because the people it's for don't have
// one, and the token itself is the gate (256 bits of crypto randomness; see
// shareRecipe in src/app/actions/recipes.ts). An unknown or revoked token
// 404s at the page.
//
// Deliberately a specific prefix rather than a broad startsWith("/share"):
// this opens exactly the recipe-sharing subtree and nothing else, so a
// future /share/... route isn't silently public the moment someone adds it.
const PUBLIC_ROUTE_PREFIXES = ["/share/recipe/"];

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (PUBLIC_ROUTES.includes(path)) {
    return NextResponse.next();
  }

  if (PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Only reads and verifies the signed cookie — no database call. Proxy runs
  // on every request including prefetches, so anything heavier here would
  // slow the whole app down.
  const session = await decrypt(request.cookies.get("session")?.value);

  if (!session?.userId) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Skips Next's build output and any static asset, so the login page keeps
  // its styling and the home-screen icons still load for someone who isn't
  // signed in. Without the image exclusions, a phone adding this to its home
  // screen would be redirected while fetching the icon and get nothing.
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
