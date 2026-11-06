import "server-only";
import { deliverWinnieEvent, type WinnieEvent, type WinnieSendResult } from "./winnieEvents";

// The one place that reads Winnie's webhook settings. WINNIE_WEBHOOK_URL and
// WINNIE_WEBHOOK_KEY are secrets set only in Vercel; with either missing
// nothing is sent. The URL and key are never logged, returned or thrown:
// logs carry only the eventId, the attempt number and the status. The retry
// rules live in winnieEvents.ts, where they are tested with a fake fetch.

export async function sendWinnieEvent(event: WinnieEvent): Promise<WinnieSendResult> {
  const url = process.env.WINNIE_WEBHOOK_URL?.trim();
  const key = process.env.WINNIE_WEBHOOK_KEY?.trim();
  if (!url || !key) {
    return { ok: false, reason: "not-configured", eventId: event.eventId, attempts: 0 };
  }
  try {
    return await deliverWinnieEvent(event, {
      url,
      key,
      fetch,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      log: (line) => console.info(line),
    });
  } catch {
    // Deliberately drops the error: it could quote the URL.
    return { ok: false, reason: "unreachable", eventId: event.eventId, attempts: 0 };
  }
}
