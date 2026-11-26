// Who may set a star value on a habit (mission 79): parents and admins. A
// kid or a device login may still edit a habit they are on, but their save
// never changes stars. Pure: no `server-only`, no database.
//
// Rewards (mission 81): who may add, edit and delete a reward, and who may
// redeem one (and undo it). Two named checks on the same roles today, so a
// later PR can widen redeem alone.
//
// Rewards R4 (mission 82): the parent PIN and wishes. Role-and-id checks only;
// the tablet's rules are in src/lib/tabletRules.ts, and "may this login do it,
// and does it need the PIN" is answered once, in src/lib/rewardGates.ts.

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

/** Set, change or switch off the parent PIN. */
export function canSetRewardPin(role: string): boolean {
  return (MANAGER_ROLES as readonly string[]).includes(role);
}

/** The login (role and id) a reward check is about. */
export type RewardActor = { userId: string; role: string };

/** A kid redeems only their own rewards (with the PIN; the gate adds it). */
export function kidMayRedeem(actor: RewardActor, ownerId: string): boolean {
  return actor.role === "kid" && actor.userId === ownerId;
}

/** A kid adds and changes wishes only for themselves. */
export function kidMayWish(actor: RewardActor, ownerId: string): boolean {
  return actor.role === "kid" && actor.userId === ownerId;
}

/** A kid or the tablet may undo only a redeem their own login made, this recently. */
export const REDEEM_UNDO_WINDOW_MS = 10 * 60 * 1000;

/** Parents and admins may undo any redemption at any time; anyone else only their own, within the window. */
export function canUndoRedeem(
  actor: RewardActor,
  redemption: { redeemedById: string | null; redeemedAt: Date },
  now: Date,
): boolean {
  if (canRedeemRewards(actor.role)) return true;
  if (redemption.redeemedById === null || redemption.redeemedById !== actor.userId) return false;
  return now.getTime() - redemption.redeemedAt.getTime() <= REDEEM_UNDO_WINDOW_MS;
}
