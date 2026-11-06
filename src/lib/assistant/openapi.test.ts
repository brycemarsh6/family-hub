import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import {
  HTTP_METHODS,
  V1_PREFIX,
  couldAnswerUnderV1,
  hasModifier,
  isLiteralV1,
  parse,
  routePattern,
  wrapperViolations,
  type Segment,
} from "../testing/assistantRouteGate";
import { buildOpenApiDocument, operations } from "./openapi";

const APP = join(process.cwd(), "src/app");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

type RouteFile = { file: string; pattern: Segment[] };

function v1RouteFiles(): RouteFile[] {
  const out: RouteFile[] = [];
  for (const file of walk(APP)) {
    const pattern = routePattern(relative(APP, file));
    if (pattern && couldAnswerUnderV1(pattern)) out.push({ file, pattern });
  }
  return out;
}

type RouteExport = { key: string; action: string | null; file: string };

/** Every wrapped HTTP export in every in-scope route file, e.g. "GET /inventory/{id}". */
function actualExports(): RouteExport[] {
  const out: RouteExport[] = [];
  for (const { file, pattern } of v1RouteFiles()) {
    // The registry spells dynamic segments by name: [id] -> {id}.
    const dirs = relative(APP, join(file, ".."))
      .split("/")
      .filter((d) => d !== "" && !/^(\(.*\)|@.*)$/.test(d));
    const shown = (isLiteralV1(pattern) ? dirs.slice(V1_PREFIX.length) : dirs).map((d) =>
      /^\[.*\]$/.test(d) ? `{${d.replace(/[[\].]/g, "")}}` : d,
    );
    const path = "/" + shown.join("/");
    const sf = parse(readFileSync(file, "utf8"), file);
    for (const st of sf.statements) {
      if (!ts.isVariableStatement(st) || !hasModifier(st, ts.SyntaxKind.ExportKeyword)) continue;
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || !HTTP_METHODS.has(d.name.text)) continue;
        const arg = d.initializer && ts.isCallExpression(d.initializer) ? d.initializer.arguments[0] : undefined;
        const action = arg && ts.isObjectLiteralExpression(arg)
          ? arg.properties.flatMap((p) =>
              ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "action" &&
              (ts.isStringLiteral(p.initializer) || ts.isNoSubstitutionTemplateLiteral(p.initializer))
                ? [p.initializer.text]
                : [],
            )[0] ?? null
          : null;
        out.push({ key: `${d.name.text} ${path}`, action, file: relative(process.cwd(), file) });
      }
    }
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
test("every route file that could answer under /api/assistant/v1/ is built only from `export const <METHOD> = assistantRoute(...)`", () => {
  const files = v1RouteFiles();
  assert.ok(files.length > 0);
  for (const { file } of files) {
    const where = relative(process.cwd(), file);
    assert.deepEqual(wrapperViolations(readFileSync(file, "utf8"), file), [], where);
  }
});

test("next.config defines no rewrites (a rewrite from the public prefix could bypass the route gate)", () => {
  const source = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
  assert.doesNotMatch(source, /\brewrites\b/);
});

test("no pages router (or root app/) exists to serve a route this test cannot see", () => {
  for (const dir of ["pages", "src/pages", "app"]) {
    assert.equal(existsSync(join(process.cwd(), dir)), false, `${dir}/ exists: its routes are outside src/app`);
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

test("date fields carry their format in the generated document (not only a runtime refine)", () => {
  const doc = JSON.parse(JSON.stringify(buildOpenApiDocument()));
  const pattern = "^\\d{4}-\\d{2}-\\d{2}$";
  const create = doc.paths["/inventory"].post.requestBody.content["application/json"].schema;
  const expiresOn = create.properties.expiresOn;
  const expiresOnString = (expiresOn.anyOf ?? [expiresOn]).find((s: { type?: string }) => s.type === "string");
  assert.equal(expiresOnString.pattern, pattern);
  const dateParam = doc.paths["/inventory"].get.parameters.find((p: { name: string }) => p.name === "date");
  assert.equal(dateParam.schema.pattern, pattern);
});
