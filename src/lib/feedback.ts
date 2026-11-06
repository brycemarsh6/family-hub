// The rules for "Send feedback", with no imports on purpose: importable from
// a Server Action, a server page and a client sheet alike, and testable
// without a database (feedback.test.ts). decodeScreenshot uses Buffer, so it
// is server-only; the rest runs anywhere. The writing lives in
// src/app/actions/feedback.ts, the reading in src/lib/feedbackRead.ts.

export const MESSAGE_MAX = 2000;

/** The most decoded screenshot bytes we keep (the browser aims for 100 to 300 KB). */
export const SCREENSHOT_MAX_BYTES = 400 * 1024;

export const USER_AGENT_MAX = 300;

/** Stamped on a Mac user agent that reported touch, so the reader can tell an iPad. */
export const TOUCH_STAMP = " (touch)";

const PAGE_PATH_MAX = 200;

export const SCREENSHOT_TYPE = "image/jpeg";

const SCREENSHOT_PREFIX = "data:image/jpeg;base64,";

export type MessageResult = { ok: true; message: string } | { ok: false; error: string };

/** Trims the message. Empty or too long is an error with a next step in it. */
export function normalizeMessage(raw: unknown): MessageResult {
  const message = typeof raw === "string" ? raw.trim() : "";
  if (message.length === 0) return { ok: false, error: "Write a message first." };
  if (message.length > MESSAGE_MAX) {
    return { ok: false, error: `Keep it under ${MESSAGE_MAX} characters, then send again.` };
  }
  return { ok: true, message };
}

/** The page the sheet opened over: an app path, no query string, else "/". */
export function normalizePagePath(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  const path = raw.split(/[?#]/)[0];
  if (path.length === 0 || path.length > PAGE_PATH_MAX) return "/";
  return path;
}

/** "1180x820" or "" when it isn't that shape (the viewport is only a note). */
export function normalizeViewport(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const text = raw.trim();
  return /^\d{2,5}x\d{2,5}$/.test(text) ? text : "";
}

/**
 * A plain-words device name plus the viewport, e.g. "iPad (820x1180)".
 * iPadOS reports a Mac user agent, so a Macintosh that has touch is an iPad.
 */
export function describeDevice(userAgent: string, viewport: string, touch = false): string {
  // sendFeedback stamps TOUCH_STAMP on a Mac user agent that had touch.
  const hasTouch = touch || userAgent.endsWith(TOUCH_STAMP);
  let label = "Unknown device";
  if (/iPhone/i.test(userAgent)) label = "iPhone";
  else if (/iPad/i.test(userAgent)) label = "iPad";
  else if (/Macintosh/i.test(userAgent) && hasTouch) label = "iPad";
  else if (/Android/i.test(userAgent) && /Mobile/i.test(userAgent)) label = "Android phone";
  else if (/Macintosh|Windows NT|X11|CrOS/i.test(userAgent)) label = "Computer";
  const size = normalizeViewport(viewport);
  return size ? `${label} (${size})` : label;
}

/**
 * Turns the browser's JPEG data URL into bytes. Anything else, or too big,
 * is null: a bad screenshot never blocks the message.
 */
export function decodeScreenshot(dataUrl: unknown): Uint8Array<ArrayBuffer> | null {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith(SCREENSHOT_PREFIX)) return null;
  const encoded = dataUrl.slice(SCREENSHOT_PREFIX.length);
  if (encoded.length === 0 || encoded.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  if ((encoded.length / 4) * 3 - padding > SCREENSHOT_MAX_BYTES) return null;
  // A plain copy: Buffer's pooled memory is not the ArrayBuffer Prisma's Bytes wants.
  return new Uint8Array(Buffer.from(encoded, "base64"));
}
