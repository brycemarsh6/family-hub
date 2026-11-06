import { HOUSEHOLD_TIME_ZONE } from "./constants";
import { zoneOffsetMs } from "./householdDate";

// Winnie's notification events and how they are delivered. Pure on purpose:
// no env var and no secret lives here. The URL, key, fetch and sleep are all
// passed in, so the retry rules are tested with a fake fetch. The server-only
// wrapper that reads the env vars is winnieNotify.ts.
//
// Rules (Bryce, mission 42): up to 3 attempts with the same eventId, about
// 1 s then 3 s apart, about 10 s per attempt. Retry only network errors,
// timeouts, 429 and 5xx; any other 4xx is a real "no" and is never retried.
// HTTP 2xx means "accepted", never "delivered".

export type WinnieEvent = {
  eventId: string;
  type: string;
  occurredAt: string;
  title: string;
  body: string;
  entityId?: string;
  intendedRecipient?: string;
};

export type WinnieEventInput = {
  type: string;
  title: string;
  body: string;
  entityId?: string;
  intendedRecipient?: string;
};

export const WINNIE_ATTEMPT_TIMEOUT_MS = 10_000;
export const WINNIE_RETRY_DELAYS_MS = [1000, 3000] as const;

const MAX_ATTEMPTS = WINNIE_RETRY_DELAYS_MS.length + 1;

/** Household (Denver) wall-clock time with its offset, no milliseconds:
 * "2026-11-06T14:03:22-07:00". Same answer whatever the process's TZ. */
function householdIso(now: Date): string {
  const offset = zoneOffsetMs(now, HOUSEHOLD_TIME_ZONE);
  const wall = new Date(Math.floor(now.getTime() / 1000) * 1000 + offset)
    .toISOString()
    .slice(0, 19);
  const sign = offset < 0 ? "-" : "+";
  const minutes = Math.abs(offset) / 60_000;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${wall}${sign}${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function buildWinnieEvent(
  input: WinnieEventInput,
  now: Date,
  eventId: string = crypto.randomUUID(),
): WinnieEvent {
  if (!input.type.trim()) throw new Error("Winnie event needs a type.");
  if (!input.title.trim()) throw new Error("Winnie event needs a title.");
  if (!input.body.trim()) throw new Error("Winnie event needs a body.");
  const event: WinnieEvent = {
    eventId,
    type: input.type,
    occurredAt: householdIso(now),
    title: input.title,
    body: input.body,
  };
  if (input.entityId !== undefined) event.entityId = input.entityId;
  if (input.intendedRecipient !== undefined) event.intendedRecipient = input.intendedRecipient;
  return event;
}

export type AttemptOutcome =
  | { kind: "status"; status: number }
  | { kind: "network" }
  | { kind: "timeout" };

export function shouldRetry(outcome: AttemptOutcome): boolean {
  if (outcome.kind !== "status") return true;
  return outcome.status === 429 || (outcome.status >= 500 && outcome.status <= 599);
}

export type WinnieSendResult =
  | { ok: true; status: number; eventId: string; attempts: number }
  | { ok: false; reason: "not-configured"; eventId: string; attempts: 0 }
  | { ok: false; reason: "rejected"; status: number; eventId: string; attempts: number }
  | { ok: false; reason: "unreachable"; status?: number; eventId: string; attempts: number };

/** One log line. Takes no URL or key, so it cannot leak them. */
export function describeAttempt(eventId: string, attempt: number, outcome: AttemptOutcome): string {
  const what =
    outcome.kind === "status"
      ? `status ${outcome.status}`
      : outcome.kind === "timeout"
        ? "timeout"
        : "network error";
  return `winnie event ${eventId} attempt ${attempt}/${MAX_ATTEMPTS}: ${what}`;
}

export type DeliverDeps = {
  url: string;
  key: string;
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  timeoutMs?: number;
  log?: (line: string) => void;
};

export async function deliverWinnieEvent(
  event: WinnieEvent,
  deps: DeliverDeps,
): Promise<WinnieSendResult> {
  const body = JSON.stringify(event);
  const timeoutMs = deps.timeoutMs ?? WINNIE_ATTEMPT_TIMEOUT_MS;
  let last: AttemptOutcome = { kind: "network" };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    let outcome: AttemptOutcome;
    try {
      const res = await deps.fetch(deps.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deps.key}`,
        },
        body,
        redirect: "manual",
        signal: controller.signal,
      });
      try {
        await res.body?.cancel();
      } catch {
        // Freeing the body is best effort.
      }
      outcome = { kind: "status", status: res.status };
    } catch {
      outcome = timedOut ? { kind: "timeout" } : { kind: "network" };
    } finally {
      clearTimeout(timer);
    }
    last = outcome;
    deps.log?.(describeAttempt(event.eventId, attempt, outcome));

    if (outcome.kind === "status" && outcome.status >= 200 && outcome.status < 300) {
      return { ok: true, status: outcome.status, eventId: event.eventId, attempts: attempt };
    }
    if (!shouldRetry(outcome) && outcome.kind === "status") {
      return {
        ok: false,
        reason: "rejected",
        status: outcome.status,
        eventId: event.eventId,
        attempts: attempt,
      };
    }
    if (attempt < MAX_ATTEMPTS) await deps.sleep(WINNIE_RETRY_DELAYS_MS[attempt - 1]);
  }

  return {
    ok: false,
    reason: "unreachable",
    ...(last.kind === "status" ? { status: last.status } : {}),
    eventId: event.eventId,
    attempts: MAX_ATTEMPTS,
  };
}
