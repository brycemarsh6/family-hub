"use server";

// The admin-only "Send test to Winnie" button on /settings. Uses the
// null-returning guard (getVerifiedUser) and shows its refusal inline, since
// a thrown redirect would bounce the browser mid-click (STRUCTURE.md
// guard-form rule). Server Actions are public POST endpoints: the admin check
// is repeated here, not trusted from the page. The result carries the
// eventId, the status and the attempt count, never the webhook URL or key.

import { getVerifiedUser } from "@/lib/dal";
import { buildWinnieEvent } from "@/lib/winnieEvents";
import { sendWinnieEvent } from "@/lib/winnieNotify";

export type SendWinnieTestResult =
  | { ok: true; eventId: string; status: number; attempts: number }
  | { ok: false; error: string };

const NOT_SIGNED_IN = "Not signed in.";
const COULDNT_REACH = "Couldn't reach Winnie after 3 tries. Wait a minute and try again.";

export async function sendWinnieTestEvent(): Promise<SendWinnieTestResult> {
  const user = await getVerifiedUser();
  if (!user) return { ok: false, error: NOT_SIGNED_IN };
  if (user.role !== "admin") return { ok: false, error: "Only an admin can send a test to Winnie." };

  try {
    const event = buildWinnieEvent(
      {
        type: "connection.test",
        title: "Connection test from Marshee",
        body: `${user.displayName} tapped "Send test to Winnie" in Marshee's Settings. If you can read this, the connection works.`,
      },
      new Date(),
    );
    const result = await sendWinnieEvent(event);
    if (result.ok) {
      return { ok: true, eventId: result.eventId, status: result.status, attempts: result.attempts };
    }
    if (result.reason === "not-configured") {
      return {
        ok: false,
        error: "Winnie isn't connected yet. Add her webhook settings in Vercel, then try again.",
      };
    }
    if (result.reason === "rejected") {
      const where = result.status === 401 || result.status === 403 ? "key" : "URL";
      return {
        ok: false,
        error: `Winnie turned the test down (error ${result.status}). Check the webhook ${where} in Vercel.`,
      };
    }
    return { ok: false, error: COULDNT_REACH };
  } catch {
    console.error("sendWinnieTestEvent failed");
    return { ok: false, error: COULDNT_REACH };
  }
}
