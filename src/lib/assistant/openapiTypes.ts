import type { ZodType } from "zod";

// The one shape of a registry row. A leaf on purpose: openapi.ts and every
// per-domain registry file (openapiInventoryPaths.ts, and the ones missions
// 22-24 add) import it from here, so no registry file ever imports the file
// that imports it.

export type Operation = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Path below /api/assistant/v1, with `{id}`-style params. */
  path: string;
  action: string;
  summary: string;
  query?: ZodType;
  body?: ZodType;
  response: string;
};
