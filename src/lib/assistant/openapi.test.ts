import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { buildOpenApiDocument, operations } from "./openapi";

const APP = join(process.cwd(), "src/app");
const HTTP = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS";
const ROUTE_FILE = /^route\.(ts|tsx|js|jsx|mjs)$/;
const V1_PREFIX = ["api", "assistant", "v1"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

type RouteFile = { file: string; urlSegments: string[] };

/**
 * Every route file under all of src/app (any of route.ts/tsx/js/jsx/mjs) that
 * would be served at /api/assistant/v1/…, with route-group segments `(x)`
 * stripped from its URL. A catch-all at or above `v1` could also answer under
 * that prefix, so one anywhere in the first three segments is returned too
 * (and then fails the shape check below, since nothing may hide there).
 */
function v1RouteFiles(): RouteFile[] {
  const out: RouteFile[] = [];
  for (const file of walk(APP)) {
    if (!ROUTE_FILE.test(file.split("/").pop()!)) continue;
    const segments = relative(APP, join(file, ".."))
      .split("/")
      .filter((s) => s !== "" && !/^\(.*\)$/.test(s));
    const catchAllAbove = segments.slice(0, 3).some((s) => /^\[\[?\.\.\./.test(s));
    const underV1 = V1_PREFIX.every((s, i) => segments[i] === s);
    if (underV1 || catchAllAbove) out.push({ file, urlSegments: segments });
  }
  return out;
}

/** Comments removed, so a commented-out `export const` can't hide or fake a match. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Index just past the `)` matching the `(` at `open`, or -1. Strings are skipped. */
function closeParen(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      for (i++; i < source.length && source[i] !== ch; i++) if (source[i] === "\\") i++;
    } else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return i + 1;
  }
  return -1;
}

/**
 * Why a v1 route file is not safely "every export is
 * `export const <METHOD> = assistantRoute(...)`". Empty means it is.
 */
function wrapperViolations(raw: string): string[] {
  const source = stripComments(raw);
  const bad: string[] = [];
  if (/^\s*export\s+(let|var)\b/m.test(source)) bad.push("`export let/var`");
  if (/\bexport\s*\*/.test(source)) bad.push("`export *`");
  if (/\bexport\s+default\b/.test(source)) bad.push("`export default`");
  if (/\bexport\s*\{/.test(source)) bad.push("`export { … }`");
  if (/\bexport\s+(async\s+)?function\b/.test(source)) bad.push("`export function`");
  if (/\b(const|let|var|function|class)\s+assistantRoute\b/.test(source) || /\bas\s+assistantRoute\b/.test(source)) {
    bad.push("a local declaration or alias named assistantRoute");
  }
  if (!/import\s*\{[^}]*\bassistantRoute\b[^}]*\}\s*from\s*"@\/lib\/assistant\/route"/.test(source)) {
    bad.push('no `import { assistantRoute } from "@/lib/assistant/route"`');
  }
  for (const m of source.matchAll(/\bexport\s+const\s+(\w+)\s*=/g)) {
    const name = m[1];
    const rest = source.slice(m.index + m[0].length);
    if (!new RegExp(`^(${HTTP})$`).test(name)) {
      bad.push(`\`export const ${name}\` is not an HTTP method`);
      continue;
    }
    const call = /^\s*assistantRoute\s*(?:<[^(]*>)?\s*\(/.exec(rest);
    if (!call) {
      bad.push(`${name} is not assigned \`assistantRoute(…)\` directly`);
      continue;
    }
    const end = closeParen(rest, call[0].length - 1);
    if (end === -1) bad.push(`${name}'s assistantRoute( call never closes`);
    else if (/^\s*,/.test(rest.slice(end))) bad.push(`${name} is followed by a comma (multi-declarator)`);
  }
  return bad;
}

type RouteExport = { key: string; action: string | null; file: string };

/** Every HTTP export in every v1 route file, e.g. key "GET /inventory/{id}". */
function actualExports(): RouteExport[] {
  const out: RouteExport[] = [];
  for (const { file, urlSegments } of v1RouteFiles()) {
    const path = "/" + urlSegments.slice(V1_PREFIX.length).map((s) => s.replace(/^\[(\w+)\]$/, "{$1}")).join("/");
    const source = stripComments(readFileSync(file, "utf8"));
    // Each export owns the text up to the next export, so its `action:` label
    // is the first one inside that slice.
    const starts = [...source.matchAll(new RegExp(`export\\s+const\\s+(${HTTP})\\b`, "g"))];
    starts.forEach((m, i) => {
      const slice = source.slice(m.index, starts[i + 1]?.index ?? source.length);
      out.push({
        key: `${m[1]} ${path}`,
        action: /action:\s*"([^"]+)"/.exec(slice)?.[1] ?? null,
        file: relative(process.cwd(), file),
      });
    });
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
test("every v1 route file under src/app is built only from `export const <METHOD> = assistantRoute(...)`", () => {
  const files = v1RouteFiles();
  assert.ok(files.length > 0);
  for (const { file, urlSegments } of files) {
    const where = relative(process.cwd(), file);
    assert.equal(
      urlSegments.slice(0, 3).some((s) => /^\[\[?\.\.\./.test(s)),
      false,
      `${where}: a catch-all at or above api/assistant/v1 could answer without the wrapper`,
    );
    assert.deepEqual(wrapperViolations(readFileSync(file, "utf8")), [], where);
  }
});

test("the wrapper check rejects every way of escaping assistantRoute", () => {
  const ok = 'import { assistantRoute } from "@/lib/assistant/route";\nexport const GET = assistantRoute({ action: "x", handler: async () => ({ data: 1 }) });\n';
  assert.deepEqual(wrapperViolations(ok), []);
  const cases: [string, string][] = [
    ["export let", ok + "export let POST = () => new Response();"],
    ["export var", ok + "export var POST = () => new Response();"],
    ["export *", ok + 'export * from "./other";'],
    ["export default", ok + "export default function () {}"],
    ["export { }", ok + "const P = 1; export { P as POST };"],
    ["export function", ok + "export async function POST() { return new Response(); }"],
    ["HEAD unwrapped", ok + "export const HEAD = () => new Response();"],
    ["OPTIONS unwrapped", ok + "export const OPTIONS = async () => new Response();"],
    ["multi-declarator", ok.replace("});\n", "}), POST = () => new Response();\n")],
    ["multi-declarator, first bare", 'import { assistantRoute } from "@/lib/assistant/route";\nexport const x = 1, GET = assistantRoute({});'],
    ["local shadow", ok + "function assistantRoute(o: unknown) { return o; }"],
    ["alias import", 'import { other as assistantRoute } from "./elsewhere";\nexport const GET = assistantRoute({});'],
    ["wrong import source", 'import { assistantRoute } from "./mine";\nexport const GET = assistantRoute({});'],
    ["non-method const", ok + "export const dynamic = 'force-dynamic';"],
  ];
  for (const [name, source] of cases) {
    assert.notDeepEqual(wrapperViolations(source), [], `should reject: ${name}`);
  }
  // Commented-out code neither fakes nor hides a match.
  assert.deepEqual(wrapperViolations(ok + "// export default 1;\n/* export let x = 1 */"), []);
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
