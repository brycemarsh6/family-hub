import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

// Reads the session cookie, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * The one page in the app that doesn't require a session — everything else
 * bounces here (see proxy.ts and the DAL).
 *
 * There's one shared family password rather than an account per person, so
 * there's no email field, no "forgot password", and no sign-up. See the auth
 * notes in CLAUDE.md for why, and for what changes when real accounts arrive.
 */
export default async function LoginPage() {
  // Already signed in? Don't make someone stare at a login form they don't
  // need — send them where they were going.
  const session = await getSession();
  if (session?.userId) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center py-16">
      <h1 className="text-3xl font-bold tracking-tight">Marsh HQ</h1>
      <p className="mt-2 text-base text-muted">
        Enter the family password to get in.
      </p>

      <LoginForm />
    </div>
  );
}
