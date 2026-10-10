import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { buildOpenApiDocument, operations } from "./openapi";

const APP = join(process.cwd(), "src/app");
const HTTP_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const ROUTE_FILE = /^route\.(ts|tsx|js|jsx|mjs|cjs)$/;
const V1_PREFIX = ["api", "assistant", "v1"];
const WRAPPER_MODULE = "@/lib/assistant/assistantRoute";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// ---- Discovery: which route files could answer under /api/assistant/v1/ ----

type Segment = { kind: "literal"; text: string } | { kind: "one" } | { kind: "rest" };

/**
 * The URL pattern of a route file given its path relative to src/app, or null
 * when it isn't a route file. Route groups `(x)` and parallel slots `@x` leave
 * no URL segment; intercepting segments `(.)x` / `(..)x` / `(...)x` are their
 * bare name; `[x]` matches one segment and `[...x]` / `[[...x]]` the rest.
 */
function routePattern(relPath: string): Segment[] | null {
  const parts = relPath.split("/");
  if (!ROUTE_FILE.test(parts[parts.length - 1])) return null;
  const out: Segment[] = [];
  for (const raw of parts.slice(0, -1)) {
    if (raw === "" || raw.startsWith("@")) continue;
    const bare = raw.replace(/^(\(\.{1,3}\))+/, "");
    if (bare === "") continue;
    if (bare !== raw) {
      out.push({ kind: "literal", text: bare });
    } else if (/^\(.*\)$/.test(raw)) {
      continue;
    } else if (/^\[\[?\.\.\./.test(raw)) {
      out.push({ kind: "rest" });
    } else if (/^\[.*\]$/.test(raw)) {
      out.push({ kind: "one" });
    } else {
      out.push({ kind: "literal", text: raw });
    }
  }
  return out;
}

/** Could this pattern match a URL that starts with /api/assistant/v1/ ? */
function couldAnswerUnderV1(pattern: Segment[]): boolean {
  for (let i = 0; i < V1_PREFIX.length; i++) {
    const seg = pattern[i];
    if (!seg) return false;
    if (seg.kind === "rest") return true;
    if (seg.kind === "literal" && seg.text !== V1_PREFIX[i]) return false;
  }
  return true;
}

function isLiteralV1(pattern: Segment[]): boolean {
  return V1_PREFIX.every((p, i) => pattern[i]?.kind === "literal" && (pattern[i] as { text: string }).text === p);
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

// ---- The rule, checked on the TypeScript syntax tree (never on text) -------

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);
}

function parse(source: string, fileName: string): ts.SourceFile {
  const kind = /\.(js|mjs|cjs)$/.test(fileName) ? ts.ScriptKind.JS : /\.(tsx|jsx)$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
}

const DECLARATION_KINDS = new Set([
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.Parameter,
  ts.SyntaxKind.BindingElement,
  ts.SyntaxKind.ImportClause,
  ts.SyntaxKind.NamespaceImport,
  ts.SyntaxKind.ImportEqualsDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ClassExpression,
]);

/**
 * Why a route file is not safely "every export is
 * `export const <METHOD> = assistantRoute(...)`". Empty means it is.
 */
function wrapperViolations(source: string, fileName = "route.ts"): string[] {
  const sf = parse(source, fileName);
  const bad: string[] = [];
  let boundImport: ts.ImportSpecifier | null = null;
  let validExports = 0;

  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      const named = st.importClause?.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const el of named.elements) {
          if (el.name.text !== "assistantRoute") continue;
          const fromWrapper =
            ts.isStringLiteral(st.moduleSpecifier) && st.moduleSpecifier.text === WRAPPER_MODULE;
          const aliased = el.propertyName !== undefined && el.propertyName.text !== "assistantRoute";
          if (fromWrapper && !aliased && !el.isTypeOnly && !st.importClause?.isTypeOnly) boundImport = el;
          else bad.push(`\`assistantRoute\` is imported from somewhere other than ${WRAPPER_MODULE}, aliased, or type-only`);
        }
      }
      continue;
    }
    if (ts.isExportDeclaration(st)) {
      if (!st.isTypeOnly) bad.push(st.exportClause ? "`export { … }` / re-export" : "`export *`");
      continue;
    }
    if (ts.isExportAssignment(st)) {
      bad.push("`export default` / `export =`");
      continue;
    }
    if (!hasModifier(st, ts.SyntaxKind.ExportKeyword)) continue;
    if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) continue;
    if (!ts.isVariableStatement(st)) {
      bad.push(`an export that is not a plain \`export const <METHOD>\` (${ts.SyntaxKind[st.kind]})`);
      continue;
    }
    if (hasModifier(st, ts.SyntaxKind.DeclareKeyword)) bad.push("`export declare const`");
    const list = st.declarationList;
    if ((list.flags & ts.NodeFlags.BlockScoped) !== ts.NodeFlags.Const) {
      bad.push("`export let/var` (or `using`)");
      continue;
    }
    if (list.declarations.length !== 1) {
      bad.push("a multi-declarator `export const a = …, b = …`");
      continue;
    }
    const decl = list.declarations[0];
    if (!ts.isIdentifier(decl.name)) {
      bad.push("a destructured `export const { … } = …`");
      continue;
    }
    const name = decl.name.text;
    if (!HTTP_METHODS.has(name)) {
      bad.push(`\`export const ${name}\` is not an HTTP method`);
      continue;
    }
    const init = decl.initializer;
    if (decl.type || decl.exclamationToken) {
      bad.push(`${name} carries a type annotation`);
    } else if (
      !init ||
      !ts.isCallExpression(init) ||
      init.questionDotToken ||
      !ts.isIdentifier(init.expression) ||
      init.expression.text !== "assistantRoute"
    ) {
      bad.push(`${name} is not assigned \`assistantRoute(…)\` directly`);
    } else {
      validExports++;
    }
  }

  const visit = (node: ts.Node): void => {
    if (
      ts.isIdentifier(node) &&
      (node.text === "module" || node.text === "exports") &&
      !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)
    ) {
      bad.push("a CommonJS `module` / `exports` reference");
    }
    const named = node as ts.Node & { name?: ts.Node };
    if (
      DECLARATION_KINDS.has(node.kind) &&
      named.name &&
      ts.isIdentifier(named.name) &&
      named.name.text === "assistantRoute"
    ) {
      bad.push("a local declaration named assistantRoute");
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (validExports > 0 && !boundImport) bad.push(`no \`import { assistantRoute } from "${WRAPPER_MODULE}"\``);
  if (validExports === 0 && bad.length === 0) bad.push("exports no HTTP method at all");
  return [...new Set(bad)];
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

test("no pages router (or root app/) exists to serve a route this test cannot see", () => {
  for (const dir of ["pages", "src/pages", "app"]) {
    assert.equal(existsSync(join(process.cwd(), dir)), false, `${dir}/ exists: its routes are outside src/app`);
  }
});

const OK =
  'import { assistantRoute } from "@/lib/assistant/assistantRoute";\n' +
  'export const GET = assistantRoute({ action: "x", handler: async () => ({ data: 1 }) });\n';

test("the wrapper check accepts a correct file (including look-alike text and type exports)", () => {
  assert.deepEqual(wrapperViolations(OK), []);
  assert.deepEqual(wrapperViolations(OK + "export type T = 1;\nexport interface I { a: 1 }\n"), []);
  assert.deepEqual(wrapperViolations(OK + 'const s = "export default function () {}";\nconst t = `export let x = 1`;\n'), []);
  assert.deepEqual(wrapperViolations(OK + "// export default 1;\n/* export let x = 1 */"), []);
  assert.deepEqual(
    wrapperViolations(OK.replace("assistantRoute({", "assistantRoute<string, undefined, undefined>({")),
    [],
  );
});

test("the wrapper check rejects every way of escaping assistantRoute", () => {
  const cases: [string, string][] = [
    ["export let", OK + "export let POST = () => new Response();"],
    ["export var", OK + "export var POST = () => new Response();"],
    ["export *", OK + 'export * from "./other";'],
    ["export { }", OK + "const P = 1; export { P as POST };"],
    ["re-export", OK + 'export { POST } from "./other";'],
    ["export default function", OK + "export default function () {}"],
    ["export default expression", OK + "export default 1;"],
    ["export function", OK + "export async function POST() { return new Response(); }"],
    ["export class", OK + "export class X {}"],
    ["export enum", OK + "export enum E { A }"],
    ["export declare const", OK + "export declare const POST: () => Response;"],
    ["HEAD unwrapped", OK + "export const HEAD = () => new Response();"],
    ["OPTIONS unwrapped", OK + "export const OPTIONS = async () => new Response();"],
    ["annotated method const", OK + "export const POST: T = assistantRoute({});"],
    ["parenthesised callee", OK + "export const POST = (assistantRoute)({});"],
    ["member callee", OK + "export const POST = x.assistantRoute({});"],
    ["optional call", OK + "export const POST = assistantRoute?.({});"],
    ["binary wrapping", OK + "export const POST = assistantRoute({}) && h;"],
    ["conditional wrapping", OK + "export const POST = c ? assistantRoute({}) : h;"],
    ["call result called again", OK + "export const POST = assistantRoute({})(x);"],
    ["multi-declarator", OK.replace("});\n", "}), POST = () => new Response();\n")],
    ["multi-declarator, first bare", 'import { assistantRoute } from "@/lib/assistant/assistantRoute";\nexport const x = 1, GET = assistantRoute({});'],
    ["destructured export", OK + "export const { POST } = x;"],
    ["non-method const", OK + "export const dynamic = 'force-dynamic';"],
    ["local function shadow", OK + "function assistantRoute(o: unknown) { return o; }"],
    ["local const shadow", OK + "const assistantRoute = (o: unknown) => o;"],
    ["parameter shadow", OK + "function h(assistantRoute: unknown) { return assistantRoute; }"],
    ["alias import", 'import { other as assistantRoute } from "@/lib/assistant/assistantRoute";\nexport const GET = assistantRoute({});'],
    ["wrong import source", 'import { assistantRoute } from "./mine";\nexport const GET = assistantRoute({});'],
    ["old import path", 'import { assistantRoute } from "@/lib/assistant/route";\nexport const GET = assistantRoute({});'],
    ["type-only import", 'import type { assistantRoute } from "@/lib/assistant/assistantRoute";\nexport const GET = assistantRoute({});'],
    ["no import", "export const GET = assistantRoute({});"],
    // Vision's comment-stripper evasion: a string holding `/*` and a later one
    // holding `*/` made a regex stripper delete the unwrapped export between.
    ["comment-stripper evasion", OK + 'const a = "/*";\nexport const POST = () => new Response();\nconst b = "*/";\n'],
    ["decoy export in a template literal", OK + "const t = `export const POST = assistantRoute({})`;\nexport const PUT = () => new Response();\n"],
    ["only a template literal mentions export", 'import { assistantRoute } from "@/lib/assistant/assistantRoute";\nconst t = `export const GET = assistantRoute({})`;\n'],
    ["commonjs", 'module.exports = { GET: () => new Response() };\n'],
    ["commonjs exports.GET", OK + "exports.POST = () => new Response();\n"],
  ];
  for (const [name, source] of cases) {
    assert.notDeepEqual(wrapperViolations(source), [], `should reject: ${name}`);
  }
});

test("discovery: which route paths could answer under /api/assistant/v1/", () => {
  const inScope = [
    "api/assistant/v1/inventory/route.ts",
    "api/assistant/v1/inventory/[id]/route.ts",
    "api/assistant/v1/route.mjs",
    "api/assistant/v1/x/route.cjs",
    "(group)/api/assistant/v1/x/route.ts",
    "api/(group)/assistant/v1/x/route.tsx",
    "api/assistant/[v]/x/route.ts",
    "[a]/assistant/v1/x/route.ts",
    "api/[...rest]/route.ts",
    "api/[[...rest]]/route.ts",
    "[...all]/route.ts",
    "api/assistant/@slot/v1/x/route.ts",
    "api/assistant/(.)v1/x/route.ts",
    "api/assistant/(..)v1/x/route.js",
    "api/assistant/(...)v1/x/route.jsx",
    "api/assistant/(..)(..)v1/x/route.ts",
  ];
  for (const p of inScope) {
    const pattern = routePattern(p);
    assert.ok(pattern && couldAnswerUnderV1(pattern), `should be in scope: ${p}`);
  }
  const outOfScope = [
    "api/voice/route.ts",
    "api/assistant/v2/x/route.ts",
    "api/assistant/route.ts",
    "kitchen/inventory/route.ts",
    "api/alexa/[id]/route.ts",
  ];
  for (const p of outOfScope) {
    const pattern = routePattern(p);
    assert.ok(pattern && !couldAnswerUnderV1(pattern), `should be out of scope: ${p}`);
  }
  assert.equal(routePattern("api/assistant/v1/x/page.tsx"), null);
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
