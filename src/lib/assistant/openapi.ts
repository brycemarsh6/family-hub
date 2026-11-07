import { z, type ZodType } from "zod";
import type { Operation } from "./openapiTypes";
import { auditQuery, undoBody } from "./schemas";
import { inventoryOperations } from "./openapiInventoryPaths";
import { recipeOperations } from "./openapiRecipePaths";
import { shoppingOperations } from "./openapiShoppingPaths";
import { summaryOperations } from "./openapiSummaryPaths";

// The Assistant API's OpenAPI 3.1 document, generated from the same zod
// schemas the routes validate with, so the spec can't describe a shape the
// routes don't accept. Pure — no database. openapi.test.ts walks the route
// files and fails when a route and a registry row disagree.

const systemOperations: Operation[] = [
  {
    method: "GET",
    path: "/audit",
    action: "audit.list",
    summary: "What the Assistant API has done: requests newest first, with the records each changed.",
    query: auditQuery,
    response: "{ requests: [...] }",
  },
  {
    method: "POST",
    path: "/audit/{requestId}/undo",
    action: "audit.undo",
    summary:
      "Undo one whole request from the audit log (an edit is put back, something she added is removed, something she deleted comes back), all or nothing, for up to 30 days. Send {}. Undoing an undo is a redo.",
    body: undoBody,
    response:
      "{ undone, restored, removed, recreated }. 409 conflict with details.reason: not_undoable, too_old, failed_request, already_undone, " +
      "or changed_since (details.records names each row that was changed by someone else since; nothing is changed). 404 for an unknown request id.",
  },
  {
    method: "GET",
    path: "/openapi.json",
    action: "openapi.get",
    summary: "This document.",
    response: "The OpenAPI document.",
  },
];

export const operations: Operation[] = [...inventoryOperations, ...shoppingOperations, ...recipeOperations, ...summaryOperations, ...systemOperations];

type JsonSchema = Record<string, unknown>;

function toSchema(schema: ZodType, io: "input" | "output" = "input"): JsonSchema {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, { io }) as JsonSchema;
  void _ignored;
  return rest;
}

function parametersFor(op: Operation) {
  const params: Record<string, unknown>[] = [];
  for (const name of op.path.match(/\{(\w+)\}/g) ?? []) {
    params.push({
      name: name.slice(1, -1),
      in: "path",
      required: true,
      schema: { type: "string" },
    });
  }
  if (op.query) {
    const s = toSchema(op.query);
    const props = (s.properties ?? {}) as Record<string, JsonSchema>;
    const required = new Set((s.required ?? []) as string[]);
    for (const [name, schema] of Object.entries(props)) {
      params.push({ name, in: "query", required: required.has(name), schema });
    }
  }
  return params;
}

export function buildOpenApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const op of operations) {
    const parameters = parametersFor(op);
    paths[op.path] ??= {};
    paths[op.path][op.method.toLowerCase()] = {
      operationId: op.action,
      summary: op.summary,
      security: [{ bearerAuth: [] }],
      ...(parameters.length > 0 ? { parameters } : {}),
      ...(op.body
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: toSchema(op.body) } },
            },
          }
        : {}),
      responses: {
        "200": { description: op.response },
        "401": { description: "Missing or wrong bearer token." },
        "429": { description: "Rate limited; see Retry-After." },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Marshee Assistant API",
      version: "1",
      description: "Private API for the household's Home Hub bot. Every call needs the bearer token.",
    },
    servers: [{ url: "/api/assistant/v1" }],
    security: [{ bearerAuth: [] }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } },
    paths,
  };
}
