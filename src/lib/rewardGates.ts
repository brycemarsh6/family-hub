// The one answer to "may this login do this reward thing, and does it need the
// parent PIN" (mission 82, Rewards R4). Pure. It sits at the top of
// `src/lib/` because it combines rewards/access.ts, rewards/pinPolicy.ts and
// tabletRules.ts, which `src/lib/rewards/` may not import (the starFlights.ts
// precedent). Actions call it before every write; the page calls
// `rewardRights` and hands the plain answer to components.

import type { Role } from "./constants";
import { canManageRewards, canRedeemRewards, kidMayRedeem, kidMayWish } from "./rewards/access";
import { pinGate } from "./rewards/pinPolicy";
import { tabletMayAddWishes, tabletMayManageRewards, tabletMayRedeemRewards } from "./tabletRules";

/** open: go ahead. pin: ask for the PIN first. noPin: needs a PIN no parent has set yet. no: not allowed. */
export type Gate = "open" | "pin" | "noPin" | "no";

/** The login a check is about. */
export type GateActor = { userId: string; role: Role };

/** The two PIN settings a gate needs (never the hash). */
export type PinState = { pinRequired: boolean; pinSet: boolean };

/** Redeem a reward owned by `ownerId`: a parent is never asked; the tablet and a kid's own go through the PIN. */
export function redeemGate(actor: GateActor, ownerId: string, pinState: PinState): Gate {
  if (canRedeemRewards(actor.role)) return "open";
  if (tabletMayRedeemRewards(actor.role) || kidMayRedeem(actor, ownerId)) {
    return pinGate(true, pinState.pinRequired, pinState.pinSet);
  }
  return "no";
}

/** Add, edit or delete a reward and its cost: a parent is never asked; the tablet goes through the PIN; a kid never. */
export function manageGate(actor: GateActor, pinState: PinState): Gate {
  if (canManageRewards(actor.role)) return "open";
  if (tabletMayManageRewards(actor.role)) return pinGate(true, pinState.pinRequired, pinState.pinSet);
  return "no";
}

/** Add, rename or delete a wish (a reward with no cost): the tablet for anyone, a kid for their own. */
export function mayChangeWish(actor: GateActor, ownerId: string): boolean {
  return tabletMayAddWishes(actor.role) || kidMayWish(actor, ownerId);
}

export type RewardRights = {
  manage: Gate;
  people: Record<string, { redeem: Gate; wish: boolean }>;
};

/** Everything the Rewards page needs to know about this login, as plain data. */
export function rewardRights(actor: GateActor, personIds: readonly string[], pinState: PinState): RewardRights {
  const people: RewardRights["people"] = {};
  for (const id of personIds) people[id] = { redeem: redeemGate(actor, id, pinState), wish: mayChangeWish(actor, id) };
  return { manage: manageGate(actor, pinState), people };
}
