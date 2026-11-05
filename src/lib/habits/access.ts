import { MANAGER_ROLES } from "../constants";
import type { HabitAccess, HabitActor } from "./types";

// Who may see, edit and check a habit (decisions 78 and 79): one policy in
// one place. Pure; the caller supplies the actor and the habit's facts.

function isParticipant(habit: HabitAccess, userId: string): boolean {
  return habit.participantIds.includes(userId);
}

function isManager(actor: HabitActor): boolean {
  return MANAGER_ROLES.includes(actor.role);
}

/** Private habits are seen only by their participants; the tablet never sees one. */
export function canSee(actor: HabitActor, habit: HabitAccess): boolean {
  if (!habit.isPrivate) return true;
  return actor.role !== "device" && isParticipant(habit, actor.userId);
}

/** Never the tablet; a participant or a manager who can see the habit. */
export function canEdit(actor: HabitActor, habit: HabitAccess): boolean {
  if (actor.role === "device" || !canSee(actor, habit)) return false;
  return isParticipant(habit, actor.userId) || isManager(actor);
}

/**
 * Whether `actor` may write a check for `forUserId`, who must be a
 * participant: yourself, the tablet for anyone, a manager for anyone. The
 * actor must also be able to see the habit.
 */
export function canLogFor(actor: HabitActor, forUserId: string, habit: HabitAccess): boolean {
  if (!isParticipant(habit, forUserId) || !canSee(actor, habit)) return false;
  return actor.userId === forUserId || actor.role === "device" || isManager(actor);
}
