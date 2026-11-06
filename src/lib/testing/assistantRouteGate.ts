import ts from "typescript";

// Pure helpers for the assistant-API route gate (see routeGate.test.ts and the
// live-route test in openapi.test.ts): which route files could answer under
// /api/assistant/v1/, and whether a route file is built only from
// `export const <METHOD> = assistantRoute(...)`. Functions over source text and
// path strings — the filesystem walk stays in openapi.test.ts.

export const HTTP_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const ROUTE_FILE = /^route\.(ts|tsx|js|jsx|mjs|cjs)$/;
export const V1_PREFIX = ["api", "assistant", "v1"];
const WRAPPER_MODULE = "@/lib/assistant/assistantRoute";

// ---- Discovery: which route files could answer under /api/assistant/v1/ ----

export type Segment = { kind: "literal"; text: string } | { kind: "one" } | { kind: "rest" };

/**
 * The URL pattern of a route file given its path relative to src/app, or null
 * when it isn't a route file. Route groups `(x)` and parallel slots `@x` leave
 * no URL segment; intercepting segments `(.)x` / `(..)x` / `(...)x` are their
 * bare name; `[x]` matches one segment and `[...x]` / `[[...x]]` the rest.
 */
export function routePattern(relPath: string): Segment[] | null {
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
export function couldAnswerUnderV1(pattern: Segment[]): boolean {
  for (let i = 0; i < V1_PREFIX.length; i++) {
    const seg = pattern[i];
    if (!seg) return false;
    if (seg.kind === "rest") return true;
    if (seg.kind === "literal" && seg.text !== V1_PREFIX[i]) return false;
  }
  return true;
}

export function isLiteralV1(pattern: Segment[]): boolean {
  return V1_PREFIX.every((p, i) => pattern[i]?.kind === "literal" && (pattern[i] as { text: string }).text === p);
}

// ---- The rule, checked on the TypeScript syntax tree (never on text) -------

export function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);
}

export function parse(source: string, fileName: string): ts.SourceFile {
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
export function wrapperViolations(source: string, fileName = "route.ts"): string[] {
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
