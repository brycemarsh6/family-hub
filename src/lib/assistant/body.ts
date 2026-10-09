// Reading a JSON request body safely — pure over a standard Request, so it
// is tested with Node's global Request and never touches Next.
//
// Why a cap here: proxy.ts matches /api/*, and Next's proxyClientMaxBodySize
// (10 MB default) silently *truncates* larger bodies rather than refusing
// them. A truncated body would parse as garbage or, worse, as something
// valid. Capping at 64 KB first makes that truncation unreachable.

import { ApiError } from "./errors";

export const MAX_BODY_BYTES = 65536;

export type BodyResult =
  | { ok: true; value: unknown }
  | { ok: false; error: ApiError };

const tooLarge = (maxBytes: number): BodyResult => ({
  ok: false,
  error: new ApiError(413, "payload_too_large", `Request body must be at most ${maxBytes} bytes.`),
});

/**
 * Read and parse a JSON body. Callers only use this for POST/PUT/PATCH —
 * GET and DELETE never have a body read.
 *
 * - `content-length` over the cap → 413 without reading anything.
 * - Bytes (not `.length` — a multibyte string is longer in bytes) over the
 *   cap after reading → 413.
 * - An empty body → `{ ok: true, value: undefined }` (some writes need none).
 * - A non-empty body that isn't `application/json` → 415.
 * - Unparseable JSON → 400 `invalid_json`.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge(maxBytes);

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) return tooLarge(maxBytes);
  if (text === "") return { ok: true, value: undefined };

  const mediaType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return {
      ok: false,
      error: new ApiError(415, "unsupported_media_type", "Send the body as application/json."),
    };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: new ApiError(400, "invalid_json", "The request body isn't valid JSON.") };
  }
}
