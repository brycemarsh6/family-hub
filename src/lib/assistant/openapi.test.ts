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

/** "method path" pairs the route files really export, e.g. "GET /inventory/{id}". */
function actualOperations(): string[] {
  const out: string[] = [];
  for (const file of routeFiles(ROOT)) {
    const dir = relative(ROOT, join(file, ".."));
    const path = "/" + dir.split("/").filter(Boolean).map((s) => s.replace(/^\[(\w+)\]$/, "{$1}")).join("/");
    const source = readFileSync(file, "utf8");
    for (const m of source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\b/g)) {
      out.push(`${m[1]} ${path}`);
    }
  }
  return out.sort();
}

test("every route has a registry entry, and every entry has a route", () => {
  const registry = operations.map((o) => `${o.method} ${o.path}`).sort();
  assert.deepEqual(registry, actualOperations());
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
