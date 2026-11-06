// Pure check for the household-order action: is a list of ids exactly the
// household's people, each once? No db import, so it has plain unit tests.
// The action (src/app/actions/usersOrder.ts) feeds it the current household
// ids from loadHouseholdPeople's filter, so a device login or a deactivated
// person is "not a household id" and fails here.

/** True only when `ids` holds every household id exactly once and nothing else. */
export function isExactHouseholdOrder(ids: readonly string[], householdIds: readonly string[]): boolean {
  if (ids.length !== householdIds.length) return false;
  const unique = new Set(ids);
  if (unique.size !== ids.length) return false;
  return householdIds.every((id) => unique.has(id));
}
