// Pins Plans & Goals' approved wording (goalPrompts.ts): the counts per area,
// no empty or repeated lines, no dashes, and that the code matches
// .avengers/plans/plans-goals-prompts.md word for word. PROMPTS_FILE points
// the parity check at another copy (used to prove the check can fail).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { LIFE_AREAS, type LifeArea } from "./goalVocabulary";
import { GOAL_IDEAS, PLAN_IDEAS, VISION_PROMPTS, nextPromptIndex, promptAt } from "./goalPrompts";

const AREA_KEYS = LIFE_AREAS.map((area) => area.key);
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

test("goalPrompts: ten vision prompts, three goal ideas and four plan ideas for every area", () => {
  for (const area of AREA_KEYS) {
    assert.equal(VISION_PROMPTS[area].length, 10, `${area} vision prompts`);
    assert.equal(GOAL_IDEAS[area].length, 3, `${area} goal ideas`);
    assert.equal(PLAN_IDEAS[area].length, 4, `${area} plan ideas`);
  }
});

test("goalPrompts: no entry is empty, repeated within its list, or holds a dash", () => {
  for (const record of [VISION_PROMPTS, GOAL_IDEAS, PLAN_IDEAS]) {
    for (const area of AREA_KEYS) {
      const list = record[area];
      assert.equal(new Set(list).size, list.length, `${area} has a repeat`);
      for (const line of list) {
        assert.ok(line.trim().length > 0, `${area} has an empty entry`);
        assert.equal(line, line.trim(), `${area} entry has stray spaces: ${line}`);
        assert.ok(!line.includes(EM_DASH) && !line.includes(EN_DASH), `${area} entry has a dash: ${line}`);
      }
    }
  }
});

type Parsed = Record<"vision" | "goal" | "plan", Record<LifeArea, string[]>>;

function parseWording(text: string): Parsed {
  const byLabel = new Map<string, LifeArea>(LIFE_AREAS.map((area) => [area.label, area.key]));
  const empty = () => Object.fromEntries(AREA_KEYS.map((key) => [key, [] as string[]])) as Record<LifeArea, string[]>;
  const parsed: Parsed = { vision: empty(), goal: empty(), plan: empty() };
  for (const section of text.split(/^## /m).slice(1)) {
    const [heading, ...lines] = section.split("\n");
    const area = byLabel.get(heading.trim());
    assert.ok(area, `unknown heading: ${heading}`);
    let into: string[] | null = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (line === "Vision prompts") into = parsed.vision[area];
      else if (line === "Goal ideas") into = parsed.goal[area];
      else if (line === "Plan ideas") into = parsed.plan[area];
      else if (into && /^\d+\. /.test(line)) into.push(line.replace(/^\d+\. /, ""));
      else if (into && line.startsWith("- ")) into.push(line.slice(2));
    }
  }
  return parsed;
}

test("goalPrompts: the code matches the approved wording file word for word", () => {
  const file = process.env.PROMPTS_FILE ?? path.join(process.cwd(), ".avengers/plans/plans-goals-prompts.md");
  const parsed = parseWording(readFileSync(file, "utf8"));
  assert.deepEqual(VISION_PROMPTS, parsed.vision);
  assert.deepEqual(GOAL_IDEAS, parsed.goal);
  assert.deepEqual(PLAN_IDEAS, parsed.plan);
});

test("promptAt: wraps with a true modulo at 10, -1 and 23", () => {
  const list = VISION_PROMPTS.health;
  assert.equal(promptAt("health", 0), list[0]);
  assert.equal(promptAt("health", 9), list[9]);
  assert.equal(promptAt("health", 10), list[0]);
  assert.equal(promptAt("health", -1), list[9]);
  assert.equal(promptAt("health", 23), list[3]);
});

test("nextPromptIndex: steps by one and wraps, so no prompt repeats until all are seen", () => {
  assert.equal(nextPromptIndex(0, 10), 1);
  assert.equal(nextPromptIndex(9, 10), 0);
  let index = 4;
  const seen = new Set<number>();
  for (let step = 0; step < 10; step += 1) {
    seen.add(index);
    index = nextPromptIndex(index, 10);
  }
  assert.equal(seen.size, 10);
  assert.equal(index, 4);
});
