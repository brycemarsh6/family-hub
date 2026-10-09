// The Assistant API's error vocabulary — pure, no imports beyond a zod type.
//
// Every refusal after authentication uses one envelope:
//   { error: { code, message, details? } }
// The one deliberate exception is the 401, which is exactly
// { error: "unauthorised" } like /api/voice: an unauthenticated caller
// learns nothing, not even the shape of the envelope.

import type { ZodError } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorResponse(err: ApiError, headers?: HeadersInit): Response {
  return Response.json(
    { error: { code: err.code, message: err.message, details: err.details } },
    { status: err.status, headers },
  );
}

/** The terse 401 — British spelling kept, same as /api/voice. */
export function unauthorisedResponse(): Response {
  return Response.json({ error: "unauthorised" }, { status: 401 });
}

/** 400 `validation`, one `{ path, message }` per zod issue. */
export function fromZodError(error: ZodError): ApiError {
  return new ApiError(400, "validation", "The request didn't match the expected shape.",
    error.issues.map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message,
    })),
  );
}
