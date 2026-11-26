import "server-only";

// The one place the Rewards routes read: the app's own readers, combined.
// Nothing here adds a bank, builds a reward or lists history itself, and the
// two PIN readers in rewardSettingsRead.ts are never called: Winnie never
// sees the PIN. Whose private habit names show is `loadStarHistory`'s rule,
// asked with Winnie's actor.

import { loadHouseholdPeople } from "@/lib/householdPeople";
import { loadRewards } from "@/lib/rewardsRead";
import { loadLateStars } from "@/lib/rewardSettingsRead";
import { loadStarBanks } from "@/lib/starBankRead";
import { loadRecentActivity, loadStarHistory } from "@/lib/starHistoryRead";
import { assistantCreatedIds } from "./audit";
import { assistantHabitActor } from "./habitActorEnv";
import { toHistoryAnswer, toRecentAnswer, toRewardsAnswer, toStarSummary } from "./serializeRewards";

/** Every household person's bank and rewards, or just `personId`'s. Null when `personId` is not a household person. */
export async function readRewards(personId?: string) {
  const household = await loadHouseholdPeople();
  const people = personId ? household.filter((person) => person.id === personId) : household;
  if (personId && people.length === 0) return null;
  const ids = people.map((person) => person.id);
  const [banks, rewards, lateStars] = await Promise.all([loadStarBanks(ids), loadRewards(ids), loadLateStars()]);
  // One query for "did Winnie make this", not one per reward.
  const createdByAssistant = await assistantCreatedIds("Reward", rewards.map((reward) => reward.id));
  return toRewardsAnswer({ people, banks, rewards, createdByAssistant, lateStars });
}

/** One person's star history and bank. Null when `personId` is not a household person. */
export async function readStarHistory(personId: string, now: Date) {
  const person = (await loadHouseholdPeople()).find((p) => p.id === personId);
  if (!person) return null;
  const [days, banks] = await Promise.all([loadStarHistory(personId, assistantHabitActor(), now), loadStarBanks([personId])]);
  return toHistoryAnswer(person, banks[personId] ?? 0, days);
}

/** The household's recent redeems and bonuses, newest first. */
export async function readRecentRewards(now: Date) {
  return toRecentAnswer(await loadRecentActivity(now));
}

/** `/summary`'s stars section: the banks and how many wishes wait for a cost. */
export async function readStarSummary() {
  const people = await loadHouseholdPeople();
  const ids = people.map((person) => person.id);
  const [banks, rewards] = await Promise.all([loadStarBanks(ids), loadRewards(ids)]);
  return toStarSummary(people, banks, rewards);
}

/** One person's reward as `GET /rewards` shows it, with the person's name and bank. Null when the person or the reward is not there. */
export async function readRewardAnswer(ownerId: string, rewardId: string) {
  const answer = await readRewards(ownerId);
  const person = answer?.people[0];
  const reward = person?.rewards.find((r) => r.id === rewardId);
  if (!person || !reward) return null;
  return { person: { personId: person.personId, name: person.name, stars: person.stars }, reward };
}

/** One household person's name and bank. Null when `personId` is not a household person. */
export async function readPersonStars(personId: string) {
  const person = (await readRewards(personId))?.people[0];
  return person ? { personId: person.personId, name: person.name, stars: person.stars } : null;
}
