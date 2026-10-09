import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { buildOpenApiDocument, operations } from "./openapi";

const ROOT = join(process.cwd(), "src/app/api/assistant/v1");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return entry === "route.ts" ? [full] : [];
  });
}

const HTTP = "GET|POST|PUT|PATCH|DELETE";

type RouteExport = { key: string; action: string | null; wrapped: boolean; file: string };

/** Every HTTP export in every v1 route file, e.g. key "GET /inventory/{id}". */
function actualExports(): RouteExport[] {
  const out: RouteExport[] = [];
  for (const file of routeFiles(ROOT)) {
    const dir = relative(ROOT, join(file, ".."));
    const path = "/" + dir.split("/").filter(Boolean).map((s) => s.replace(/^\[(\w+)\]$/, "{$1}")).join("/");
    const source = readFileSync(file, "utf8");
    // Each export owns the text up to the next export, so its `action:` label
    // is the first one inside that slice.
    const starts = [...source.matchAll(new RegExp(`export (?:const|async function|function) (${HTTP})\\b`, "g"))];
    starts.forEach((m, i) => {
      const slice = source.slice(m.index, starts[i + 1]?.index ?? source.length);
      out.push({
        key: `${m[1]} ${path}`,
        action: /action:\s*"([^"]+)"/.exec(slice)?.[1] ?? null,
        wrapped: new RegExp(`^export const ${m[1]} = assistantRoute\\b`).test(slice),
        file: relative(process.cwd(), file),
      });
    });
    // `export { GET }` and re-exports would dodge the pattern above.
    assert.equal(/export\s*\{/.test(source), false, `${file} re-exports instead of declaring`);
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

test("every route has a registry entry, and every entry has a route", () => {
  const registry = operations.map((o) => `${o.method} ${o.path}`).sort();
  assert.deepEqual(registry, actualExports().map((e) => e.key).sort());
});

// The public-prefix amendment in proxy.ts and STRUCTURE.md is only safe while
// this holds: a v1 route not built with assistantRoute would be reachable with
// no bearer check at all.
test("every exported HTTP method in a v1 route is `export const <METHOD> = assistantRoute`", () => {
  const exports = actualExports();
  assert.ok(exports.length > 0);
  for (const e of exports) {
    assert.equal(e.wrapped, true, `${e.key} (${e.file}) is not built with assistantRoute`);
  }
});

test("each route's action label equals its registry row's label", () => {
  const byKey = new Map(operations.map((o) => [`${o.method} ${o.path}`, o.action]));
  for (const e of actualExports()) {
    assert.ok(e.action, `${e.key} (${e.file}) has no action label`);
    assert.equal(e.action, byKey.get(e.key), `${e.key} route label vs registry`);
  }
});

test("the document is valid JSON and every operation carries security", () => {
  const doc = JSON.parse(JSON.stringify(buildOpenApiDocument()));
  assert.equal(doc.openapi, "3.1.0");
  assert.equal(doc.info.title, "Marshee Assistant API");
  let count = 0;
  for (const item of Object.values(doc.paths) as Record<string, { security?: unknown }>[]) {
    for (const op of Object.values(item)) {
      count++;
      assert.deepEqual(op.security, [{ bearerAuth: [] }]);
    }
  }
  assert.equal(count, operations.length);
});

test("request bodies and query parameters come from the zod schemas", () => {
  const doc = JSON.parse(JSON.stringify(buildOpenApiDocument()));
  const create = doc.paths["/inventory"].post.requestBody.content["application/json"].schema;
  assert.equal(create.additionalProperties, false);
  assert.ok(create.properties.name);
  const names = doc.paths["/inventory"].get.parameters.map((p: { name: string }) => p.name);
  assert.ok(names.includes("withinDays") && names.includes("status"));
  assert.equal(doc.paths["/inventory/{id}"].get.parameters[0].in, "path");
});
