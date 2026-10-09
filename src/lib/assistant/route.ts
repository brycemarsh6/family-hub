import "server-only";

import { after } from "next/server";
import type { NextRequest } from "next/server";
import type { ZodType } from "zod";
import { isMissingRowError } from "@/lib/prismaErrors";
import { parseBearer, isTokenValid } from "./authPolicy";
import { ApiError, errorResponse, fromZodError, unauthorisedResponse } from "./errors";
import { readJsonBody } from "./body";
import { isRateLimited } from "./rateLimit";
import { recordRequest, pruneAudit, type ChangeInput } from "./audit";

// The wrapper every Assistant API route is built from, so a route file is
// ~20 lines: declare an action label, optional zod schemas, and a handler.
//
// Why a Route Handler and not a Server Action: the caller is Bryce's bot, not
// one of our buttons. Server Actions' wire format is a React implementation
// detail an external client shouldn't have to reproduce; a plain HTTP API is
// what it can actually talk to (the /api/voice reasoning, again).
//
// SECURITY: this is a public URL with write power over the household's data.
// proxy.ts is a UX layer that can be misconfigured, so the real gate is here,
// next to the data, and runs before anything is parsed or written. The order
// below is deliberate and must not be rearranged:
//   env hash missing -> 404 (the API doesn't exist)
//   bearer wrong     -> 401 terse, nothing learned
//   rate limit       -> 429 + Retry-After
//   body, zod        -> only now is untrusted input touched
//   handler          -> then the audit row, awaited
// 401, 404 and 429 are not recorded; everything from the body step onward is,
// including 4xx and 5xx, so GET /audit shows what the bot attempted.
//
// No `force-dynamic` export: route GET handlers are dynamic by default in
// Next 15+, and a route.ts may export only HTTP methods anyway. Don't add it
// by reflex.
//
// No revalidatePath: every (app) page is force-dynamic and the layout reads
// request-time cookies, so nothing here is server-cached; and a Route Handler
// can't purge a phone's client-side router cache regardless.
//
// The audit write is awaited, not put in after(): after() can't tell the
// caller it failed, and a silent hole in the log defeats its purpose. A
// failed write is a 500 `audit_failed` (the data change already happened —
// the message says so). after() is used only for the opportunistic prune.

export type AssistantHandlerArgs<P, B, Q> = {
  request: NextRequest;
  params: P;
  body: B;
  query: Q;
  now: Date;
  /** Push one entry per record the handler created, updated or deleted. */
  changes: ChangeInput[];
};

export type AssistantHandlerResult = { status?: number; data: unknown };

type Options<P, B, Q> = {
  /** Stable label recorded in the audit log, e.g. "inventory.adjust". */
  action: string;
  body?: ZodType<B>;
  query?: ZodType<Q>;
  handler: (args: AssistantHandlerArgs<P, B, Q>) => Promise<AssistantHandlerResult>;
};

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH"]);

/** ~2% of calls tidy up old audit rows; cheap, and no cron needed. */
const PRUNE_ODDS = 0.02;

export function assistantRoute<
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
>(options: Options<P, B, Q>): (request: NextRequest, context: { params: Promise<P> }) => Promise<Response> {
  return async (request, context) => {
    const startedAt = Date.now();

    const expectedHash = process.env.ASSISTANT_API_TOKEN_HASH;
    if (!expectedHash) return Response.json({}, { status: 404 });

    const token = parseBearer(request.headers.get("authorization"));
    if (token === null || !isTokenValid(token, expectedHash)) return unauthorisedResponse();

    const now = new Date();
    try {
      const limit = await isRateLimited(now);
      if (limit.limited) {
        return errorResponse(
          new ApiError(429, "rate_limited", "Too many requests. Slow down."),
          { "retry-after": String(limit.retryAfterSeconds) },
        );
      }
    } catch (error) {
      console.error("[assistant] rate limit check failed:", error);
      return errorResponse(new ApiError(500, "internal", "Something went wrong."));
    }

    const changes: ChangeInput[] = [];
    let status = 200;
    let response: Response;
    let failure: ApiError | null = null;

    try {
      let body = undefined as B;
      if (WRITE_METHODS.has(request.method)) {
        const read = await readJsonBody(request);
        if (!read.ok) throw read.error;
        if (options.body) {
          const parsed = options.body.safeParse(read.value);
          if (!parsed.success) throw fromZodError(parsed.error);
          body = parsed.data;
        }
      }

      let query = undefined as Q;
      if (options.query) {
        const parsed = options.query.safeParse(
          Object.fromEntries(request.nextUrl.searchParams),
        );
        if (!parsed.success) throw fromZodError(parsed.error);
        query = parsed.data;
      }

      const params = await context.params;
      const result = await options.handler({ request, params, body, query, now, changes });
      status = result.status ?? 200;
      response = Response.json(result.data, { status });
    } catch (error) {
      if (error instanceof ApiError) {
        failure = error;
      } else if (isMissingRowError(error)) {
        failure = new ApiError(404, "not_found", "That record doesn't exist.");
      } else {
        console.error("[assistant] failed:", error);
        failure = new ApiError(500, "internal", "Something went wrong.");
      }
      status = failure.status;
      response = errorResponse(failure);
    }

    let requestId: string;
    try {
      requestId = await recordRequest({
        method: request.method,
        path: request.nextUrl.pathname,
        action: options.action,
        status,
        durationMs: Date.now() - startedAt,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || null,
        error: failure ? `${failure.code}: ${failure.message}`.slice(0, 500) : null,
        changes,
      });
    } catch (error) {
      console.error("[assistant] audit write failed:", error);
      return errorResponse(
        new ApiError(
          500,
          "audit_failed",
          "The request was handled but could not be logged. Check /audit before retrying.",
        ),
      );
    }

    if (Math.random() < PRUNE_ODDS) {
      after(() =>
        pruneAudit().catch((error) => console.error("[assistant] audit prune failed:", error)),
      );
    }

    response.headers.set("x-assistant-request-id", requestId);
    return response;
  };
}
