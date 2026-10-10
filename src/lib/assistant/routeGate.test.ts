import { test } from "node:test";
import assert from "node:assert/strict";
import { couldAnswerUnderV1, routePattern, wrapperViolations } from "../testing/assistantRouteGate";

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
