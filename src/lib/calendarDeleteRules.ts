// Mission 76: who may delete a calendar event or task. Pure, no database: the
// Server Actions feed it fresh rows, the view mappers feed it the same shape
// to draw the sheet's note. One source of the rule and of its words.
//
// The rule: the caller (admin or parent) may delete unless the item has at
// least one OTHER active adult (admin or parent, not deactivated) on it AND
// the caller is not on it. Kid-only, nobody, or only deactivated adults on it
// never blocks (otherwise those items could never be deleted).

import { MANAGER_ROLES } from "./constants";

/** One person on the item, with what the rule needs. */
export type DeleteRulePerson = {
  userId: string;
  displayName: string;
  role: string;
  deactivated: boolean;
};

/** The other active adults who own the item, or an empty list when the caller may delete. */
export function deleteBlockers(callerUserId: string, people: DeleteRulePerson[]): string[] {
  if (people.some((person) => person.userId === callerUserId)) return [];
  return people
    .filter((person) => !person.deactivated && (MANAGER_ROLES as readonly string[]).includes(person.role))
    .map((person) => person.displayName);
}

/** "Emily", "Emily and Sam", "A, B and C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The warn note's words, or null when the caller may delete. */
export function deleteBlockedMessage(callerUserId: string, people: DeleteRulePerson[]): string | null {
  const names = deleteBlockers(callerUserId, people);
  return names.length === 0 ? null : `Only ${joinNames(names)} can delete this.`;
}
