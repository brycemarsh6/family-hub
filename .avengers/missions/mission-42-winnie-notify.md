# Mission 42: Marshee → Winnie notification sender

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch:** `claude/winnie-notify-ed0df7` (from `origin/main` at `a1f9b6e`)

## Brief

- **Goal:** Winnie's Phase 1. Marshee can push a JSON event to the Grok Bot webhook routine Winnie created ("Marshee notifications — connection test"). The only sender in this mission is an admin-only "Send test to Winnie" button in Settings.
- **Done means:** an admin taps "Send test to Winnie" in Settings; Marshee POSTs `{ eventId, type: "connection.test", occurredAt, title, body }` with `Authorization: Bearer <key>` to `WINNIE_WEBHOOK_URL`, retrying network errors, timeouts, 429 and 5xx up to 3 attempts with the same eventId, never retrying any other 4xx; the screen says what happened in plain words; with either env var unset nothing is sent and the screen says Winnie isn't connected. The gauntlet passes, nothing secret reaches the browser bundle or logs, the PR is green, and Bryce has said go before the merge.
- **Out of scope:** real household alerts, texts, Zapier, choosing alert types, recipients or quiet hours, any reply path back to Marshee, any change to the Assistant API, any schema change, the "Chat with Winnie" button, the Siri shortcut.

## Bryce's decisions (2026-11-06, don't re-litigate)

All from the brief Bryce and Winnie wrote and Bryce approved:
- Env vars `WINNIE_WEBHOOK_URL` and `WINNIE_WEBHOOK_KEY`, Vercel Production, marked Sensitive. Bryce enters them himself; never pasted in chat.
- Event shape `{ eventId, type, occurredAt (ISO with offset), title, body, entityId?, intendedRecipient? }`. `eventId` from `crypto.randomUUID()`, generated once, reused on every retry.
- Up to 3 attempts, about 1 s then 3 s apart, about 10 s timeout per attempt. Retry only network errors, timeouts, 429 and 5xx.
- HTTP 2xx means "accepted", never "delivered".
- Never log, return or expose the URL or key; logs show only eventId, attempt count and status.
- The mock (word for word):
  ```
  Winnie                                  (admins only)
  ┌───────────────────────────────────────────────┐
  │ Send a test message to Winnie                 │
  │ Shows in Winnie's chat between 9 AM and 9 PM. │
  │                     [ Send test to Winnie ]   │
  └───────────────────────────────────────────────┘
  After tapping:  "Winnie accepted the test (event 3f2a…).
                   Check her chat to confirm it arrived."
  ```
- **Ask Bryce before merging** (overrides the usual "merges don't wait"). Bryce runs the end-to-end test after merge.
- Bryce confirmed Fury's plan on 2026-11-06, including the two structural calls below.

## Design (Fury's structural calls)

1. **Pure module plus a thin server-only wrapper.** `src/lib/winnieEvents.ts` is pure (no env var, no secret): event building, the retry rule, the backoff schedule, and the delivery loop with `fetch`, `sleep` and the timeout passed in. `src/lib/winnieNotify.ts` (`server-only`) reads the env vars and supplies the real `fetch`. Reason: STRUCTURE.md's `server-only` rule (a module skips it only when it reads no env var) and the `loginRateLimitPolicy.ts` / `loginRateLimit.ts` precedent; the retry behaviour gets tested with a fake fetch and no real URL or key.
2. **The action uses guard form (a), `getVerifiedUser()` plus an inline admin check**, not `requireRole`. STRUCTURE.md reserves `requireRole` for files whose UI sits behind a page gated by the same `requireRole`; `/settings` uses `requireVerifiedUser`. Precedent: `recomputeAllStreaks` (`src/app/actions/habits.ts`).
3. **Plain `useState` in the component**, as in `HabitsChoresSettings`: a one-shot send is not an optimistic update.
4. `occurredAt` uses Denver's offset (`HOUSEHOLD_TIME_ZONE`), via `zoneOffsetMs` in `src/lib/householdDate.ts` (exported for this; one source of truth for zone offsets).

## Hill's decisions (2026-11-06; Bryce can overturn any)

Hill ran as a general agent on Fable with `.claude/agents/hill.md`'s laws (the `hill` type was not registered in this session).

- **200 (high):** "(admins only)" in the mock is a note, not screen text. The section renders only for `user.role === "admin"`, like Manage family and Feedback, which carry no label.
- **201 (high):** while sending, the button reads "Sending…" and is disabled (`disabled:opacity-40`). Precedent: `FeedbackSheet.tsx` (`pending ? "Sending…" : "Send"`).
- **202 (high):** not configured: "Winnie isn't connected yet. Add her webhook settings in Vercel, then try again." (`text-warn`, `role="alert"`).
- **203 (medium):** refused, 401 or 403: "Winnie turned the test down (error 401). Check the webhook key in Vercel." Any other non-retried 4xx: "Winnie turned the test down (error 404). Check the webhook URL in Vercel." Always the real number; DESIGN.md writes it as "(error 403)".
- **204 (medium):** retries ran out: "Couldn't reach Winnie after 3 tries. Wait a minute and try again." The phone couldn't reach Marshee at all (client-side catch): "Couldn't send the test. Check your connection and try again."
- **205 (high):** success line exactly as the mock, first 4 characters of the eventId then "…": "Winnie accepted the test (event 3f2a…). Check her chat to confirm it arrived." (`text-muted`, `role="status"`).
- **206 (medium):** the event's title "Connection test from Marshee"; body `<Display name> tapped "Send test to Winnie" in Marshee's Settings. If you can read this, the connection works.` ("notifications work" would promise alerts Phase 1 doesn't have.)
- **207 (high):** non-admin: "Only an admin can send a test to Winnie."

For Bryce to look at first: 203, 204, 206.

## Danger register

- AGENTS.md applies in full. This mission needs **no database writes**; no `db:*` script runs.
- **The webhook URL and key are secrets.** No agent reads `.env`, asks for them, or writes them to any file. Local tests use a fake URL (`http://127.0.0.1:<port>/hook`) and a fake key (`test-key`) set only in the dev server's process environment.
- No real request to Winnie's webhook from any agent. The first real send is Bryce's tap after merge.
- Never edit `prisma/schema.prisma`, `src/app/api/assistant/**`, `src/lib/assistant/**`, habits or goals files (parallel sessions own them).
- Stage by explicit path; `git show --stat HEAD` after each commit.

## Gauntlet

```
npx tsc --noEmit
npx eslint .
npm test
TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts
TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts
npm run build
```

## Assembled

Stark + Vision + Strange (visible Settings change). Captain only if the diff passes about 300 code lines. No Banner (Fury's Explore brief covered the precedents). Hill for wording.

## Contracts

### C1 — The sender: pure event and delivery module, its tests, the server-only wrapper

- **Status:** DONE
- **Objective:** `sendWinnieEvent(event)` exists, server-only, and its retry, timeout, header, body and not-configured behaviour is proven by unit tests with a fake fetch.

- **Boundaries:** may touch: new `src/lib/winnieEvents.ts`, new `src/lib/winnieEvents.test.ts`, new `src/lib/winnieNotify.ts`, `src/lib/householdDate.ts` (only: add the export keyword to its zone offset helper), `.env.example` (append two commented, empty lines). Must not touch: anything else, in particular `package.json`, `.github/`, `prisma/`, `src/app/**`, `src/components/**`, and any env file holding secrets.

- **Spec:**
- `winnieEvents.ts` (pure, no `server-only`, no `process.env`):
  - `export type WinnieEvent = { eventId: string; type: string; occurredAt: string; title: string; body: string; entityId?: string; intendedRecipient?: string }`.
  - `export function buildWinnieEvent(input: { type; title; body; entityId?; intendedRecipient? }, now: Date, eventId: string = crypto.randomUUID()): WinnieEvent`. `occurredAt` is the Denver wall-clock time with its offset, e.g. `2026-11-06T14:03:22-07:00` (no milliseconds), computed with `zoneOffsetMs(now, HOUSEHOLD_TIME_ZONE)`, correct across DST in any process TZ. Optional fields are omitted from the object when not given (not `undefined` keys). Throws on an empty `type`, `title` or `body` (trimmed).
  - `export const WINNIE_ATTEMPT_TIMEOUT_MS = 10_000; export const WINNIE_RETRY_DELAYS_MS = [1000, 3000] as const;` (so 3 attempts in all).
  - `export type AttemptOutcome = { kind: "status"; status: number } | { kind: "network" } | { kind: "timeout" }`.
  - `export function shouldRetry(outcome: AttemptOutcome): boolean`: true for network, timeout, 429, 500 to 599; false otherwise.
  - `export type WinnieSendResult = { ok: true; status: number; eventId: string; attempts: number } | { ok: false; reason: "not-configured"; eventId: string; attempts: 0 } | { ok: false; reason: "rejected"; status: number; eventId: string; attempts: number } | { ok: false; reason: "unreachable"; status?: number; eventId: string; attempts: number }` (`unreachable` = retries ran out; `status` is the last HTTP status if the last attempt got one).
  - `export async function deliverWinnieEvent(event, deps: { url: string; key: string; fetch: typeof fetch; sleep: (ms: number) => Promise<void>; timeoutMs?: number; log?: (line: string) => void }): Promise<WinnieSendResult>`. Each attempt: `POST url`, headers `Content-Type: application/json` and `Authorization: Bearer ${key}`, body `JSON.stringify(event)` (identical bytes every attempt), `redirect: "manual"`, an `AbortController` aborted after `timeoutMs` (default `WINNIE_ATTEMPT_TIMEOUT_MS`), timer always cleared. An abort is `timeout`; any other throw is `network`. Response body is not read beyond what is needed to free it (`await res.body?.cancel()` or `res.arrayBuffer()` in a try). 2xx → ok. Not retryable → `rejected`. Retryable and attempts remain → `sleep(WINNIE_RETRY_DELAYS_MS[i])` then retry. After each attempt call `log(describeAttempt(...))`.
  - `export function describeAttempt(eventId: string, attempt: number, outcome: AttemptOutcome): string` → e.g. `winnie event 3f2a… attempt 2/3: status 503` / `: timeout` / `: network error`. Uses the full eventId. Takes no URL or key argument, so it cannot leak them.
- `winnieNotify.ts`: `import "server-only"` on line 1. `export async function sendWinnieEvent(event: WinnieEvent): Promise<WinnieSendResult>`. Reads `process.env.WINNIE_WEBHOOK_URL` and `process.env.WINNIE_WEBHOOK_KEY`; if either is unset or blank returns `{ ok: false, reason: "not-configured", eventId: event.eventId, attempts: 0 }` and makes no request. Otherwise `deliverWinnieEvent` with the global `fetch`, a `setTimeout` sleep, and `log` = `console.info`. Never logs, returns or throws anything containing the URL or key (catch unexpected throws and return `unreachable`). A short header comment in the style of `recipeUrlImport.ts`.
- `winnieEvents.test.ts` (node:test + `node:assert/strict`, like `src/lib/feedback.test.ts`; fake URL `http://127.0.0.1:9/hook`, fake key `test-key`; a fake `sleep` that records delays and resolves at once; a fake `fetch` scripted per attempt). At least:
  1. `buildWinnieEvent` at a fixed summer instant gives `-06:00` and the right Denver wall time; a winter instant gives `-07:00`; same result whatever `process.env.TZ` (the gauntlet runs three TZs).
  2. Optional fields absent when not given, present when given; empty title throws.
  3. `eventId` default is a UUID; a passed eventId is kept.
  4. `shouldRetry` table: 200 no, 400 no, 401 no, 404 no, 429 yes, 500 yes, 503 yes, network yes, timeout yes.
  5. 200 first try → `{ ok: true, status: 200, attempts: 1 }`, one fetch call, method POST, both headers exact, body parses back to the event.
  6. 500, 500, 200 → ok, `attempts: 3`, sleeps `[1000, 3000]`, every body byte-identical with the same eventId.
  7. 401 → `rejected`, `attempts: 1`, no sleep.
  8. 503 three times → `unreachable`, `status: 503`, `attempts: 3`.
  9. Network throw then 200 → ok, `attempts: 2`.
  10. Timeout: fake fetch that never resolves until its `signal` aborts (reject with an `AbortError` on abort), `timeoutMs: 20` → three `timeout` attempts → `unreachable` with no status.
  11. Every logged line (collected via `log`) contains the eventId and contains neither the fake URL nor `test-key`.

- **Verification:**
- `npx tsc --noEmit` → exit 0.
- `npx eslint .` → exit 0, no new warnings.
- `npm test` → exit 0; the new file's tests listed and passing; total count up by the number of new tests.
- `TZ=UTC node --import tsx --test src/lib/winnieEvents.test.ts` and `TZ=America/Los_Angeles node --import tsx --test src/lib/winnieEvents.test.ts` → pass.
- `head -1 src/lib/winnieNotify.ts` → `import "server-only";`. `grep -n "process.env" src/lib/winnieEvents.ts` → nothing.
- `git diff --stat` shows only the may-touch files.

- **Evidence required:** each command with its tail of output; the test names; `wc -l` of the new files; the diff of `householdDate.ts` and `.env.example`.

- **Done criteria:** Fury re-runs `npm test` and sees the new tests pass; the diff touches only the five paths.

- **Report:** Stark, 2026-11-06: three new files (winnieEvents.ts 169 lines, its test 149 with 11 tests, winnieNotify.ts 28), `export` on `zoneOffsetMs`, two commented lines in `.env.example`. His tsc failed only on mission 41's `familyOrder` (a stale generated Prisma client in this worktree); Fury ran `npx prisma generate` (local code only, no database) and re-ran: tsc exit 0, `npm test` 1176 pass, 0 fail. Extra exports `WinnieEventInput` and `DeliverDeps` (types only). A 3xx counts as `rejected` (`redirect: "manual"`).

### C2 — The button: Server Action, Settings section, one line on the Settings page

- **Status:** DISPATCHED
- **Objective:** an admin sees a "Winnie" section in Settings whose button sends a `connection.test` event through `sendWinnieEvent` and shows Hill's wording for each outcome.
- **Boundaries:** may touch: new `src/app/actions/winnie.ts`, new `src/components/WinnieSettings.tsx`, `src/app/(app)/settings/page.tsx` (only: one import and one admin-gated render line). Must not touch: `src/lib/winnieEvents.ts`, `src/lib/winnieNotify.ts` (C1's, done), `src/components/HabitsChoresSettings.tsx`, `src/app/actions/habits.ts`, `package.json`, `prisma/`, `src/app/api/`, `src/lib/assistant/`, and any env file holding secrets.
- **Spec:**
  - `src/app/actions/winnie.ts`: `"use server"` first line; header comment in the style of `src/app/actions/habits.ts`. `export type SendWinnieTestResult = { ok: true; eventId: string; status: number; attempts: number } | { ok: false; error: string }`. `export async function sendWinnieTestEvent(): Promise<SendWinnieTestResult>`: `getVerifiedUser()` from `@/lib/dal` (null → `{ ok: false, error: "Not signed in." }`); `user.role !== "admin"` → decision 207's words. Build with `buildWinnieEvent({ type: "connection.test", title: "Connection test from Marshee", body: <decision 206 with user.displayName> }, new Date())`, then `sendWinnieEvent`. Map: ok → `{ ok: true, eventId, status, attempts }`; `not-configured` → 202; `rejected` with 401/403 → 203 key wording, other → 203 URL wording (real status number in both); `unreachable` → 204's first sentence. Whole body in try/catch (`console.error("sendWinnieTestEvent failed")` with no event contents, return 204's wording). Never returns the URL or key.
  - `src/components/WinnieSettings.tsx`: `"use client"`, no props. Copy the section scaffolding of `src/components/HabitsChoresSettings.tsx` (`<section className="mt-6">`, `<h2 className="text-lg font-semibold">Winnie</h2>`). Then one card (`mt-3 rounded-xl border border-line bg-surface p-4`) holding `Send a test message to Winnie` (`text-base font-medium`), `Shows in Winnie's chat between 9 AM and 9 PM.` (`mt-1 text-sm text-muted`), and a right-aligned button `Send test to Winnie` with a Lucide `Send` icon (`aria-hidden`, outline, size 20). Button: at least 48px tall (`min-h-12`), styled like the Send button in `src/components/FeedbackSheet.tsx` (read it and reuse its classes), `disabled` while sending with "Sending…" (201), `disabled:opacity-40`. State with plain `useState` (`sending`, `message`, `error`), as `HabitsChoresSettings` does; clear both messages at the start of each send. Success → `role="status"` `mt-2 text-sm text-muted` line with decision 205's words (`eventId.slice(0, 4)` then "…"). Failure → `role="alert"` `mt-2 text-sm text-warn` line with the returned error; client-side catch → 204's second sentence. The status lines sit inside the card under the button.
  - `src/app/(app)/settings/page.tsx`: import `WinnieSettings`; render `{user.role === "admin" && <WinnieSettings />}` directly after the `!user.isDevice` Habits & Chores / Vacation block and before Sign out.
- **Verification:**
  - `npx tsc --noEmit` → exit 0. `npx eslint .` → exit 0.
  - `npm test` → exit 0, same count as after C1.
  - `npm run build` → exit 0; then `grep -rlE "WINNIE_WEBHOOK|winnieNotify|Bearer " .next/static` → no output.
  - `git diff --stat` → only the three may-touch paths.
- **Evidence required:** each command with its output tail; `wc -l` of the two new files; the settings page diff.
- **Done criteria:** Fury re-runs tsc and the bundle grep; the diff touches only the three paths.
- **Report:** (pending)

### C3 — Records (Fury)

Mission file, a short STRUCTURE.md entry, the CLAUDE.md lines (Assistant API neighbour bullet and the Current status line replacing the stale mission 40 line).

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

Budget: 3 passes per gate, then STOP.

## Handoff log

- 2026-11-06 Fury: branch reset onto `origin/main` (`a1f9b6e`; it had no commits of its own). Mission number 42 checked free on `origin/main` and in every worktree. Plan confirmed by Bryce. `hill` is not registered as an agent type in this session, so Hill runs as a general agent on Fable with her `.claude/agents/hill.md` laws.

## Delivery

(pending)
