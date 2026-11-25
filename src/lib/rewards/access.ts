// Who may set a star value on a habit (mission 79): parents and admins. A
// kid or a device login may still edit a habit they are on, but their save
// never changes stars. Pure: no `server-only`, no database.
//
// Rewards (mission 81): who may add, edit and delete a reward, and who may
// redeem one (and undo it). Two named checks on the same roles today, so a
// later PR can widen redeem alone.

import { MANAGER_ROLES } from "../constants";

export function canSetStars(role: string): boolean {
  return (MANAGER_ROLES as readonly string[]).includes(role);
}

/** Add, edit and delete a reward. */
export function canManageRewards(role: string): boolean {
  return (MANAGER_ROLES as readonly string[]).includes(role);
}

/** Redeem a reward and undo a redeem. */
export function canRedeemRewards(role: string): boolean {
  return (MANAGER_ROLES as readonly string[]).includes(role);
}
