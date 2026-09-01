// The pure half of the last-active-admin lockout guard — no imports, no
// database — split out of src/app/actions/usersRoles.ts (Family Accounts
// v1 Phase 3a) per mission-6's C4 contract, the same loginRateLimitPolicy.ts
// pattern: the *decision* (would this leave the household unmanageable?) is
// testable without a database; the counting query
// (otherActiveAdminCount in usersRoles.ts) stays there, since it's the part
// that actually needs Prisma.
//
// This is the highest-stakes guard in the accounts phase — get it wrong and
// a household can be locked out of managing itself with no way back in —
// so it's worth it living somewhere `node:test` can hold it directly rather
// than only being exercised live.

/**
 * Whether an admin-only action that could remove someone's admin-ness
 * (changing their role away from "admin", or deactivating them) is allowed
 * to proceed.
 *
 * `targetIsAdmin` means "would this specific action leave the target no
 * longer an active admin" — the caller computes it differently per action:
 * for a role change, that's "they currently ARE an active admin AND the
 * new role isn't admin" (changing an admin's role to "admin" is a no-op,
 * never a demotion); for deactivation, it's simply "they currently are an
 * active admin" (deactivating always removes their ability to act,
 * regardless of role).
 *
 * `isSelf` is accepted here (rather than only checked by the caller before
 * ever calling this) so the *whole* lockout decision — "nobody can target
 * themselves, and the last active admin can never be stranded" — is one
 * function a test can hold in full, even though both call sites in
 * usersRoles.ts happen to also short-circuit on `isSelf` earlier for a
 * more specific error message ("you can't change your own role" vs "you
 * can't deactivate yourself").
 */
export function canDemoteOrDeactivate({
  isSelf,
  targetIsAdmin,
  otherActiveAdminCount,
}: {
  isSelf: boolean;
  targetIsAdmin: boolean;
  otherActiveAdminCount: number;
}): boolean {
  if (isSelf) return false;
  if (targetIsAdmin && otherActiveAdminCount === 0) return false;
  return true;
}
