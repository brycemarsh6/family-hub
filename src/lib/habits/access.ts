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

/**
 * Private habits are seen only by their participants; the tablet never sees one.
 */
export function canSeeHabit(actor: HabitActor, habit: HabitAccess): boolean {
  if (!habit.isPrivate) return true;
  return actor.role !== "device" && isParticipant(habit, actor.userId);
}

/**
 * Never the tablet; a participant or a manager who can see the habit.
 */
export function canEditHabit(actor: HabitActor, habit: HabitAccess): boolean {
  if (actor.role === "device" || !canSeeHabit(actor, habit)) return false;
  return isParticipant(habit, actor.userId) || isManager(actor);
}

/**
 * Who edits a person's chore chart (decision 118): yourself; a parent or
 * admin for anyone. A kid only their own. Never the tablet.
 */
export function canEditChart(actor: HabitActor, personId: string): boolean {
  return actor.role !== "device" && (actor.userId === personId || isManager(actor));
}

/**
 * Whose Report a person may open (decision 164): yourself; a parent or admin
 * for anyone. Never the tablet.
 */
export function canSeeHabitReport(actor: HabitActor, personId: string): boolean {
  return actor.role !== "device" && (actor.userId === personId || isManager(actor));
}

/**
 * Who changes a chore for one week (decisions 117, 118, 125): `personId` must
 * hold the chore and the actor must see it and edit that person's chart; and
 * a chore shared by more than one person is a parent's or admin's to change,
 * so a kid can change only a chore that is theirs alone. Never the tablet.
 */
export function canChangeChore(actor: HabitActor, habit: HabitAccess, personId: string): boolean {
  if (!isParticipant(habit, personId) || !canSeeHabit(actor, habit) || !canEditChart(actor, personId)) return false;
  return habit.participantIds.length <= 1 || isManager(actor);
}

/**
 * Whether `actor` may write a check for `forUserId`, who must be a
 * participant: yourself, the tablet for anyone, a manager for anyone. The
 * actor must also be able to see the habit.
 */
export function canLogFor(actor: HabitActor, forUserId: string, habit: HabitAccess): boolean {
  if (!isParticipant(habit, forUserId) || !canSeeHabit(actor, habit)) return false;
  return actor.userId === forUserId || actor.role === "device" || isManager(actor);
}

/**
 * Who opens a habit's stats page (decision 102): a participant; a manager or
 * the tablet, but only for a habit that is not private. Nobody else.
 */
export function canSeeHabitStats(actor: HabitActor, habit: HabitAccess): boolean {
  if (!canSeeHabit(actor, habit)) return false;
  return isParticipant(habit, actor.userId) || actor.role === "device" || isManager(actor);
}

/**
 * What the nudge rule needs beyond `HabitAccess`: how the habit is shared,
 * whether it is archived, and which participants are deactivated (a caller that
 * leaves it out is saying none are).
 */
export type NudgeHabit = HabitAccess & { sharing: string; archived: boolean; deactivatedIds?: readonly string[] };

/**
 * Whether `actor` may nudge `toUserId` about a habit (decision 97): never the
 * tablet, never yourself, only on a Side by side habit that is not private or
 * archived, and only between two of its participants, the recipient still
 * active. Whether the recipient
 * has finished today is a fact about the day, so the caller checks it.
 */
export function canNudge(actor: HabitActor, habit: NudgeHabit, toUserId: string): boolean {
  return (
    actor.role !== "device" &&
    habit.sharing === "each" &&
    !habit.isPrivate &&
    !habit.archived &&
    toUserId !== actor.userId &&
    isParticipant(habit, actor.userId) &&
    isParticipant(habit, toUserId) &&
    !habit.deactivatedIds?.includes(toUserId)
  );
}
