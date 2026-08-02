import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

// The Data Access Layer: the single place the rest of the app asks "is this
// request allowed?".
//
// Why this exists rather than just checking in proxy.ts: a Server Action is a
// real POST endpoint on the public internet. Anyone can call one directly with
// curl — they don't have to go through our buttons. So the check has to sit
// next to the data, in every action, not only in front of the pages. The
// Next.js auth guide is blunt about it: proxy "should not be your only line of
// defense".
//
// `cache()` memoises the result for the duration of a single render pass, so
// a page that calls this in several places still only verifies once.

export type Session = {
  isAuth: true;
  userId: string;
};

/**
 * Require a signed-in visitor. Redirects to /login if there isn't one, so
 * callers can assume a valid session on the line after.
 *
 * Use this in pages and anywhere a redirect is the right response.
 */
export const verifySession = cache(async (): Promise<Session> => {
  const session = await getSession();

  if (!session?.userId) {
    redirect("/login");
  }

  return { isAuth: true, userId: session.userId };
});

/**
 * The same check, but returns null instead of redirecting.
 *
 * Server Actions use this: `redirect()` inside an action throws a control-flow
 * signal that the caller may not expect, and an unauthenticated write should
 * simply not happen rather than bounce someone's browser mid-request.
 */
export const getVerifiedSession = cache(
  async (): Promise<Session | null> => {
    const session: SessionPayload | null = await getSession();
    if (!session?.userId) return null;
    return { isAuth: true, userId: session.userId };
  },
);
