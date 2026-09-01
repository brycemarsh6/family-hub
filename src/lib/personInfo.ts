// The "person as the admin UI is allowed to see them" projection — the one
// piece of Family Accounts boilerplate where silent divergence has real
// consequences, since it's what strips `passwordHash` from anything that
// reaches a client. Used to exist three times (users.ts, usersRoles.ts, and
// a hand-inlined copy in settings/family/page.tsx); hoisted here so there's
// exactly one place a wider `select` could ever leak a hash from.
//
// Pure over its inputs (no db import, no env var, no secret of its own) —
// same reasoning password.ts documents for why it carries no `server-only`
// guard. The password *hash* passes through `toPersonInfo` on its way to
// being discarded, which is exactly the "sensitive material passing through
// a pure module" case STRUCTURE.md's boundary rule names password.ts for;
// the guarded action or page that calls this is where secrecy actually
// lives.

import { toRole, toAvatarColor, type Role, type AvatarColor } from "./constants";

/** A person as the admin UI is allowed to see them. Deliberately has no
 * `passwordHash` field at all — see toPersonInfo() below, which never
 * spreads the underlying database row, so a wider `select` later can't
 * leak one by accident. */
export type PersonInfo = {
  id: string;
  displayName: string;
  role: Role;
  avatarColor: AvatarColor;
  hasAccount: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
};

/** The exact `select` every caller needs to build a PersonInfo — pass this
 * straight to Prisma rather than retyping the field list. */
export const PERSON_SELECT = {
  id: true,
  displayName: true,
  role: true,
  avatarColor: true,
  passwordHash: true,
  deactivatedAt: true,
  createdAt: true,
} as const;

/** The shape PERSON_SELECT produces — raw string `role`/`avatarColor`
 * (Prisma has no enum here, see constants.ts's no-enums schema rule), plus
 * the passwordHash toPersonInfo below strips out. */
export type PersonRow = {
  id: string;
  displayName: string;
  role: string;
  avatarColor: string;
  passwordHash: string | null;
  deactivatedAt: Date | null;
  createdAt: Date;
};

/** Builds the public shape field by field — never `{ ...row }` — so a
 * `passwordHash` column can never ride along even if PERSON_SELECT is
 * widened later. This is what "no action may ever return a
 * passwordHash" actually means in code. */
export function toPersonInfo(row: PersonRow): PersonInfo {
  return {
    id: row.id,
    displayName: row.displayName,
    role: toRole(row.role),
    avatarColor: toAvatarColor(row.avatarColor),
    hasAccount: row.passwordHash !== null,
    deactivatedAt: row.deactivatedAt,
    createdAt: row.createdAt,
  };
}
