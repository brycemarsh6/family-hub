import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isOwnerCopy } from "@/lib/copyConfig";
import { SCREENSHOT_TYPE, decodeScreenshot } from "@/lib/feedback";
import { FORWARD_BODY_MAX_BYTES, parseForwardedFeedback } from "@/lib/feedbackForward";
import { inboxKeyMatches, isInboxRateLimited } from "@/lib/feedbackInbox";

// Where relatives' copies send their feedback (mission 90). Only Bryce's copy
// answers, and only when FEEDBACK_INBOX_KEY is set. The order matters: each
// refusal happens before the next step, so a stranger never reaches the body
// or the database.

const empty = (status: number) => new Response(null, { status });

/** Reads the body up to the cap; null means it went past the cap. */
async function readCapped(request: NextRequest): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > FORWARD_BODY_MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: NextRequest) {
  // Not the owner's copy, or no key set: this door doesn't exist.
  if (!isOwnerCopy() || !process.env.FEEDBACK_INBOX_KEY) return empty(404);

  if (!inboxKeyMatches(request.headers.get("authorization"))) return empty(401);

  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > FORWARD_BODY_MAX_BYTES) return empty(413);

  const text = await readCapped(request);
  if (text === null) return empty(413);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return empty(400);
  }
  const parsed = parseForwardedFeedback(json);
  if (!parsed.ok) return empty(400);
  const { value } = parsed;

  try {
    if (await isInboxRateLimited(value.family)) return empty(429);
    const screenshot = decodeScreenshot(value.screenshot);
    await db.feedback.create({
      data: {
        authorId: "forwarded",
        authorName: value.authorName,
        sourceFamily: value.family,
        message: value.message,
        pagePath: value.pagePath,
        userAgent: value.userAgent,
        viewport: value.viewport || null,
        screenshot,
        screenshotType: screenshot ? SCREENSHOT_TYPE : null,
      },
    });
  } catch {
    return empty(500);
  }
  return Response.json({ ok: true }, { status: 201 });
}
