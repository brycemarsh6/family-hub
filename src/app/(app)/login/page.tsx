import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getVerifiedUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { toRole } from "@/lib/constants";
import { LoginForm } from "./LoginForm";

// Reads the session cookie, so it can never be cached.
export const dynamic = "force-dynamic";

// This page now lists real family first names (the account chips below) —
// harmless to the household, but there's no reason to let it be indexed.
// Same precedent as the public /share/* pages' own root layout.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The one page in the app that doesn't require a session — everything else
 * bounces here (see proxy.ts and the DAL).
 *
 * Family Accounts v1 replaced the single shared family password with a
 * per-person account: tap your name, then enter your password. Only real
 * *accounts* (passwordHash set) can sign in — the three kid *profiles*
 * (Ledger, Eleanor, Lucy) have no password and deliberately never appear
 * here, since they can't sign in yet (that's Phase 3+ of the plan).
 */
export default async function LoginPage() {
  // Already signed in? Don't make someone stare at a login form they don't
  // need — send them where they were going. This has to be the DB-backed
  // getVerifiedUser(), not the cookie-only getSession(): a session cookie
  // that merely *decrypts* still redirects here even after its owner was
  // deactivated, because getSession() never checks the database. That used
  // to strand a deactivated person on a dead shell (app chrome, no account
  // menu, every branch bouncing) with /login unreachable until the 30-day
  // cookie expired — the DAL is what actually knows the account is gone,
  // so it's the DAL that has to gate this convenience redirect.
  const user = await getVerifiedUser();
  if (user) {
    redirect("/");
  }

  // Select only what the chip list and the password step need — never
  // passwordHash itself, even though this is a page render rather than an
  // API response. There's no reason a person row's hash should ever be in
  // scope for a page component to accidentally serialize.
  const accountRows = await db.user.findMany({
    where: { passwordHash: { not: null }, deactivatedAt: null },
    select: { id: true, displayName: true, avatarColor: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  const accounts = accountRows.map((account) => ({
    ...account,
    role: toRole(account.role),
  }));

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center py-16">
      <h1 className="text-3xl font-bold tracking-tight">Marsh HQ</h1>

      {accounts.length === 0 ? (
        // No dead form — an honest state naming the actual fix, matching
        // the house rule that every error/empty state names a next step.
        <p className="mt-2 text-base text-muted">
          No accounts exist yet. In a terminal, run{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">
            npm run db:bootstrap-users
          </code>{" "}
          to create one.
        </p>
      ) : (
        <>
          <p className="mt-2 text-base text-muted">Who&apos;s signing in?</p>
          <LoginForm accounts={accounts} />
        </>
      )}
    </div>
  );
}
