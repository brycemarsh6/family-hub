// Guards a dev crash that has hit this project three times (PersonInfo in
// users.ts, HabitInput in habits.ts, RecipeIngredientSuggestion in
// groceriesRecipes.ts): in a "use server" file, a re-export of a type,
// `export type { X }` or `export type { X } from "..."`, survives the dev
// server-action transform as a runtime reference to a name TypeScript has
// already erased, so every action in that file throws "X is not defined".
// Declaring a type in the file (`export type X = ...`) is fine; only the
// re-export clause breaks. Components import such types from their lib home.
// Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

const isUseServer = (text: string) => /^\s*["']use server["'];?/.test(text);
// `export type {` and `export { type X }` / `export { X, type Y }` clauses.
const TYPE_REEXPORT = /^export\s+(type\s*\{|\{[^}]*\btype\s)/m;

test("no \"use server\" file re-exports a type", () => {
  const offenders = sourceFiles(ROOT)
    .filter((path) => {
      const text = readFileSync(path, "utf8");
      return isUseServer(text) && TYPE_REEXPORT.test(text);
    })
    .map((path) => path.slice(ROOT.length + 1));
  assert.deepEqual(offenders, [], `import these types from their lib module instead: ${offenders.join(", ")}`);
});

test("the guard itself catches both re-export shapes (positive control)", () => {
  assert.ok(TYPE_REEXPORT.test('"use server";\nexport type { X };\n'));
  assert.ok(TYPE_REEXPORT.test('export type { X } from "@/lib/x";'));
  assert.ok(TYPE_REEXPORT.test("export { doThing, type X } from './x';"));
  assert.ok(!TYPE_REEXPORT.test("export type X = { error?: string };"));
  assert.ok(!TYPE_REEXPORT.test("export async function doThing() {}"));
});

test("the scan finds the action files (it is not looking at an empty folder)", () => {
  const useServer = sourceFiles(ROOT).filter((path) => isUseServer(readFileSync(path, "utf8")));
  assert.ok(useServer.length >= 10, `found only ${useServer.length} "use server" files`);
});
