// Pins Habits & Chores' approved idea library (habitIdeas.ts): six habit ideas
// per life area and eight chores, no repeats or dashes, valid icons and
// schedules, and that the code matches .avengers/plans/habits-ideas.md word for
// word. IDEAS_FILE points the parity check at another copy (used to prove the
// check can fail).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LIFE_AREAS, type LifeArea } from "./goalVocabulary";
import {
  CHORE_IDEAS,
  CHORE_IDEAS_LABEL,
  HABIT_IDEAS,
  LIFE_AREA_HINT,
  LIFE_AREA_HINT_PICK,
  findHabitIdea,
  habitIdeasLabel,
  type HabitIdea,
} from "./habitIdeas";
import { HABIT_ICONS, HABIT_TIMES_LIMITS, TIME_OF_DAY_LABELS, ANYTIME_LABEL } from "./habitVocabulary";

const AREA_KEYS = LIFE_AREAS.map((area) => area.key);
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ALL_LISTS: { name: string; list: readonly HabitIdea[] }[] = [
  ...AREA_KEYS.map((area) => ({ name: area, list: HABIT_IDEAS[area] })),
  { name: "chores", list: CHORE_IDEAS },
];

test("habitIdeas: six ideas for every life area and eight chores", () => {
  for (const area of AREA_KEYS) assert.equal(HABIT_IDEAS[area].length, 6, `${area} ideas`);
  assert.equal(CHORE_IDEAS.length, 8);
});

test("habitIdeas: titles are never empty, padded, dashed or repeated, even across lists", () => {
  const seen = new Set<string>();
  for (const { name, list } of ALL_LISTS) {
    for (const idea of list) {
      assert.ok(idea.title.length > 0, `${name} has an empty title`);
      assert.equal(idea.title, idea.title.trim(), `${name} title has stray spaces: ${idea.title}`);
      assert.ok(!idea.title.includes(EM_DASH) && !idea.title.includes(EN_DASH), `${name} title has a dash: ${idea.title}`);
      assert.ok(!seen.has(idea.title), `repeated title: ${idea.title}`);
      seen.add(idea.title);
    }
  }
});

test("habitIdeas: every icon is on the allow-list and every schedule is one the form can save", () => {
  for (const { name, list } of ALL_LISTS) {
    for (const idea of list) {
      assert.ok((HABIT_ICONS as readonly string[]).includes(idea.icon), `${name}: ${idea.title} icon ${idea.icon}`);
      if (idea.schedule === "weekdays") {
        assert.ok(idea.days.length > 0, `${idea.title} needs days`);
        assert.equal(new Set(idea.days).size, idea.days.length, `${idea.title} repeats a day`);
        for (const day of idea.days) assert.ok(Number.isInteger(day) && day >= 0 && day <= 6, `${idea.title} day ${day}`);
        assert.equal(idea.times, null);
      } else if (idea.schedule === "weekly" || idea.schedule === "monthly") {
        const max = HABIT_TIMES_LIMITS[idea.schedule];
        assert.ok(idea.times !== null && Number.isInteger(idea.times) && idea.times >= 1 && idea.times <= max, `${idea.title} times`);
        assert.equal(idea.days.length, 0);
      } else {
        assert.equal(idea.schedule, "daily", `${idea.title} schedule`);
        assert.equal(idea.days.length, 0);
        assert.equal(idea.times, null);
      }
    }
  }
});

test("findHabitIdea: finds a habit idea and a chore idea by title, else null", () => {
  assert.equal(findHabitIdea("Scripture study")?.icon, "BookOpen");
  assert.equal(findHabitIdea("No phone in bed")?.mode, "quit");
  assert.equal(findHabitIdea("Feed the pets")?.timeOfDay, "morning");
  assert.equal(findHabitIdea("Not an idea"), null);
  for (const { list } of ALL_LISTS) for (const idea of list) assert.equal(findHabitIdea(idea.title), idea);
});

test("habitIdeas: the form's words", () => {
  assert.equal(habitIdeasLabel("health"), "Ideas for Health");
  assert.equal(habitIdeasLabel("financial"), "Ideas for Work & Money");
  assert.equal(CHORE_IDEAS_LABEL, "Chore ideas");
  assert.equal(LIFE_AREA_HINT, "Optional");
  assert.equal(LIFE_AREA_HINT_PICK, "Optional. Pick one to see ideas.");
});

/** One idea as a line of habits-ideas.md prints it (without the number). */
function printIdea(idea: HabitIdea): string {
  let often = "Every day";
  if (idea.schedule === "weekly") often = `Weekly, ${idea.times} ${idea.times === 1 ? "time" : "times"}`;
  if (idea.schedule === "monthly") often = `Monthly, ${idea.times} ${idea.times === 1 ? "time" : "times"}`;
  if (idea.schedule === "weekdays") often = `Certain days: ${idea.days.map((day) => DAY_NAMES[day]).join(", ")}`;
  const when = idea.timeOfDay ? TIME_OF_DAY_LABELS[idea.timeOfDay] : ANYTIME_LABEL;
  return [idea.title, idea.icon, often, when, ...(idea.mode === "quit" ? ["quit"] : [])].join(" | ");
}

function parseIdeas(text: string): Record<string, string[]> {
  const byLabel = new Map<string, string>([...LIFE_AREAS.map((area) => [area.label, area.key] as [string, string]), ["Chores", "chores"]]);
  const parsed: Record<string, string[]> = {};
  for (const section of text.split(/^## /m).slice(1)) {
    const [heading, ...lines] = section.split("\n");
    const key = byLabel.get(heading.trim());
    assert.ok(key, `unknown heading: ${heading}`);
    parsed[key] = lines.map((line) => line.trim()).filter((line) => /^\d+\. /.test(line)).map((line) => line.replace(/^\d+\. /, ""));
  }
  return parsed;
}

test("habitIdeas: the code matches the approved wording file word for word", () => {
  const file = process.env.IDEAS_FILE ?? path.join(process.cwd(), ".avengers/plans/habits-ideas.md");
  const parsed = parseIdeas(readFileSync(file, "utf8"));
  assert.deepEqual(Object.keys(parsed).sort(), [...AREA_KEYS, "chores"].sort());
  for (const area of AREA_KEYS as LifeArea[]) assert.deepEqual(HABIT_IDEAS[area].map(printIdea), parsed[area], area);
  assert.deepEqual(CHORE_IDEAS.map(printIdea), parsed.chores);
});
