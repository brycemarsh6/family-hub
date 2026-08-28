# Mission: V3 Phase A — the Alexa endpoint, built and proven closed

**Project:** family-hub (Marsh HQ)
**Status:** DELIVERED (uncommitted — awaiting Bryce)
**Started:** 2026-08-28 · **Updated:** 2026-08-28

Plan source: `/Users/brycemarsh/.claude/plans/ancient-discovering-sutherland.md`
(approved by Bryce). This mission executes **Phase A only** — Phases B
(Amazon developer console walkthrough) and C (positive control + full
adversarial check + real Echo) require Bryce and an Amazon account, and are
out of scope here.

## Brief

- **Goal:** Build `/api/alexa`, a Route Handler that speaks Alexa's own
  protocol — verifying Amazon's request signature, certificate chain,
  timestamp, and our own skill ID — then reuses the existing
  `parseTranscript` + `applyActions` voice backend as direct library
  imports. V1 (`/api/voice`) and V2 (Siri) already work; Alexa is a third
  thin client over the same libs, not a second backend.
- **Done means:** the gauntlet passes; `/api/alexa` exists and rejects
  every locally-craftable request (no signature, garbage signature,
  garbage cert URL, non-JSON body, GET) with a 4xx and **zero database
  writes**, proven by before/after Prisma counts; the pure helpers in
  `src/lib/voice/alexa.ts` are unit-tested and those tests run under
  `npm test`; `/api/voice` (Siri) still works after `proxy.ts` is edited.
- **Out of scope:** creating the Amazon developer account, the developer
  console walkthrough, the positive control (impossible without a genuine
  Alexa signature), the real-Echo test, pushing, and setting any Vercel
  env var. Phase A deliberately cannot prove a real request *passes* —
  see "The honest limit" below.

## The honest limit (read before judging the evidence)

No request craftable on this laptop can pass the signature gate, so
"everything is rejected" is — at this phase — indistinguishable from
"the endpoint is broken." That is expected and is why the plan puts the
**positive control first in Phase C** (the Alexa simulator sends genuinely
signed requests). In Phase A, `isFromOurSkill` and the request dispatch are
proven by **unit tests only**, and no security claim beyond "the signature
gate rejects unsigned traffic" may be made. Vision should hold the report
to exactly that claim — an overclaim here is a BLOCKER.

## Danger register (absolute)

- **The dev database IS the live family database** (477 pantry items, real
  household data). Never `npm run db:seed`, never `npm run db:reset`. This
  mission expects **zero** database writes; any write is a failure, not a
  cleanup task.
- **Secrets never in git or chat.** `ALEXA_SKILL_ID` gets a *placeholder*
  in `.env.example` (committed) and its real value only in `.env` / Vercel
  later. Same for the existing `VOICE_API_TOKEN` / `ANTHROPIC_API_KEY`
  entries being backfilled — placeholders only.
- **Never push.** Bryce pushes. After delivery, report
  `git log origin/main..HEAD` (this repo has been bitten three times by
  finished-but-unpushed work).
- **It's `proxy.ts`, not `middleware.ts`** (Next 16) — a `middleware.ts`
  silently won't run.
- No Prisma schema change is needed or permitted in this mission.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `npm run build`

## Assembled

- **Stark + Vision** — always.
- **Captain — IN.** This mission creates a new top-level `alexa/`
  directory, a new module in `src/lib/voice/`, and a new route under
  `src/app/api/`. Placement and dependency direction are live questions,
  and STRUCTURE.md's layout map doesn't yet mention a repo-root `alexa/`.
- **Strange — OUT.** Phase A changes nothing a human sees; there is no
  screen, no component, no styling in scope.
- **Banner — OUT.** Research is already done: the Explore brief plus
  Fury's own reads of `src/app/api/voice/route.ts`, `src/proxy.ts`,
  `STRUCTURE.md`, `.env.example`, and `package.json`. Facts are in the
  contracts below with citations.

## Established facts (verified, do not re-derive)

- `src/app/api/voice/route.ts` — POST-only; `x-voice-token` via SHA-256 +
  `timingSafeEqual` against `VOICE_API_TOKEN`, checked *before* the body is
  read; body `{transcript: string}`; success `{speech: string}` 200; the
  401 path returns `{error: "unauthorised"}` (the one non-`{speech}` shape).
  This file is the structural template to mirror.
- `src/lib/voice/parse.ts` — `parseTranscript(transcript) → ParsedAction[]`,
  `ParsedAction = {action: "use"|"add"|"buy"|"undo", item: string,
  quantity: number}`. Returns `[]` on failure rather than throwing.
- `src/lib/voice/apply.ts` — `applyActions(actions) → {speech, noop}`.
  The `speech` string is the Alexa `outputSpeech` verbatim; no adaptation.
- `src/proxy.ts:28` — `PUBLIC_ROUTES = ["/login", "/api/voice"]`, exact-match
  check at lines 51-53. The file's comment already explains public ≠
  unauthenticated; extend that comment, don't duplicate it.
- `package.json:10` — `"test": "node --import tsx --test src/lib/*.test.ts"`.
  This glob does **not** reach `src/lib/voice/`.
- `.env.example` — documents only `DATABASE_URL`, `SESSION_SECRET`,
  `FAMILY_PASSWORD`. `VOICE_API_TOKEN` and `ANTHROPIC_API_KEY` were never
  added; backfill them as placeholders.
- No Alexa scaffolding exists anywhere in the repo — fully greenfield.

## Contracts

### C1 — The pure Alexa helpers, their unit tests, and the interaction model

- **Status:** DONE
- **Objective:** Create the testable, secret-free half of the Alexa
  integration — envelope types, the skill-ID predicate, slot extraction,
  response builders — with unit tests wired into `npm test`, plus the
  committed interaction model whose slot name those helpers read.
- **Boundaries:**
  - may touch: `src/lib/voice/alexa.ts` (new),
    `src/lib/voice/alexa.test.ts` (new), `package.json` (test script glob
    ONLY), `alexa/interaction-model.json` (new)
  - must not touch: `src/app/**`, `src/proxy.ts`, `.env.example`,
    `src/lib/voice/parse.ts`, `src/lib/voice/apply.ts`, `src/lib/match.ts`,
    `prisma/**`, any dependency in `package.json` other than the `test`
    script string
- **Requirements:**
  - `src/lib/voice/alexa.ts` — **no `server-only` guard** (it must run
    under `node --test`, and holds no secrets: the expected skill ID
    arrives as a parameter). Same precedent as `src/lib/match.ts` and
    `src/lib/duplicates.ts`.
  - Minimal hand-written TS types covering only the fields read:
    `request.type`, `request.intent.name`,
    `request.intent.slots.command.value`,
    `session.application.applicationId`,
    `context.System.application.applicationId`, `request.timestamp`.
    **Do not install `ask-sdk-model`** for types.
  - `isFromOurSkill(envelope, expectedSkillId)` → false when the expected
    ID is empty/absent, when the envelope carries no ID in either
    location, or when any present ID mismatches. Fails closed.
  - `getSpokenText(envelope)` → trimmed `command` slot value, `""` when
    the intent, slots, or value are absent.
  - Response builders returning `{version: "1.0", response: {...}}`:
    `speech(text, {endSession})` using **PlainText** (apply.ts returns
    prose, not SSML), `speechWithReprompt(text, reprompt)`, and
    `emptyResponse()` for `SessionEndedRequest` (which forbids speech in
    the reply).
  - `alexa/interaction-model.json` — invocation name `marsh h. q.`;
    `CommandIntent` whose only sample utterance is `{command}`; a custom
    slot type (`CatchAllText`) with ~10 representative values spanning all
    four verbs (e.g. "i used two hot dogs", "we need diapers", "add milk
    to the shopping list", "undo"); built-ins `AMAZON.StopIntent`,
    `AMAZON.CancelIntent`, `AMAZON.HelpIntent`, `AMAZON.FallbackIntent`,
    `AMAZON.NavigateHomeIntent`. **Not `AMAZON.SearchQuery`** — it forbids
    a bare `{slot}` sample and its mandatory carrier phrases would strip
    the verb the parser needs. The slot name in this file MUST match what
    `getSpokenText` reads.
  - `package.json` — widen the test glob to also match
    `src/lib/voice/*.test.ts`. Change the script string and nothing else.
- **Verification:** `npm test` (new tests green, the existing 33 still
  green) · `npx tsc --noEmit` · `npx eslint .` · `node -e` parse of the
  interaction model JSON to prove it's valid JSON
- **Evidence required:** full `npm test` output showing the new test names
  and the total count; the exact `package.json` diff; the JSON parse
  result; a statement of the slot name used, appearing in both
  `alexa.ts` and `interaction-model.json`
- **Done criteria:** Fury re-reads `alexa.ts` and confirms no
  `server-only`, no secret reads, no imports from `app/` or `components/`;
  test count strictly increased; slot name matches across both files
- **Report:** —

### C2 — The route handler, its verifier dependency, and the proxy entry

- **Status:** DONE
- **Objective:** Create `/api/alexa` speaking Alexa's protocol with
  signature, timestamp, and skill-ID gates ahead of any parsing or writing,
  reusing `parseTranscript` + `applyActions` directly.
- **Boundaries:**
  - may touch: `src/app/api/alexa/route.ts` (new), `src/proxy.ts`
    (`PUBLIC_ROUTES` + its comment ONLY), `.env.example`, `package.json` +
    `package-lock.json` (adding the verifier dependency ONLY)
  - must not touch: `src/app/api/voice/route.ts`, `src/lib/voice/parse.ts`,
    `src/lib/voice/apply.ts`, `src/lib/voice/alexa.ts` (C1's output —
    consume it; if it needs changing, report BLOCKED-ON-CONTRACT),
    `prisma/**`, `src/app/(app)/**`, `src/components/**`
- **Requirements:**
  - **Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`
    ("Request Body") before writing the route** — per AGENTS.md, this Next
    version differs from training data, and `request.text()` is not yet
    used anywhere in this repo.
  - Install `ask-sdk-express-adapter` and use its standalone
    `SkillRequestSignatureVerifier` + `TimestampVerifier` classes (no
    Express server involved — Amazon documents this standalone usage).
    `alexa-verifier` was rejected: community-maintained, unclear
    `Signature-256` support. **After install, report the package's actual
    exports and its dependency tree**, and confirm the route stays on the
    Node.js runtime (the default — do NOT add `export const runtime =
    "edge"`; the verifiers need Node crypto).
  - Gate order, each a hard stop before the next:
    1. `const rawBody = await request.text()` — the signature is computed
       over these exact bytes. **Never `request.json()` first.** Say so in
       a comment.
    2. `SkillRequestSignatureVerifier` then `TimestampVerifier` (default
       150s tolerance). Any throw → 400 `{error: "unauthorised"}`, terse,
       with only a short `[alexa]`-prefixed `console.error`. An attacker
       learns nothing about why (mirrors the voice route's 401 comment).
    3. `JSON.parse(rawBody)`, then `isFromOurSkill(envelope,
       process.env.ALEXA_SKILL_ID ?? "")` → mismatch 400. Missing env var
       → the misconfigured-500 pattern of `isValidToken`'s throw
       (`src/app/api/voice/route.ts:28-33`), fix instructions in the
       server log only. Fail-closed until Phase B supplies the real ID.
    4. Dispatch on request type: `LaunchRequest` → welcome + reprompt,
       session open. `IntentRequest`/`CommandIntent` → `getSpokenText`;
       empty → usage prompt with **no Haiku call** (cost gate); >500 chars
       → the same "too long" cap the voice route uses; otherwise
       `parseTranscript` → `applyActions` → speak `speech`, end session,
       wrapped in try/catch returning "Something went wrong updating the
       kitchen." **as a valid Alexa envelope**, not `{speech}` JSON.
       `AMAZON.StopIntent`/`CancelIntent` → goodbye, end.
       `AMAZON.HelpIntent`/`FallbackIntent` → examples, session open.
       `SessionEndedRequest` → `emptyResponse()`, 200.
  - `src/proxy.ts` — add `"/api/alexa"` to `PUBLIC_ROUTES` and extend the
    existing public-≠-unauthenticated comment to say the Amazon signature
    plus skill-ID check is this route's real gate (strictly stronger than
    a shared token). Do not restructure the file.
  - `.env.example` — add `ALEXA_SKILL_ID` with a placeholder and a comment
    that the value comes from the Alexa developer console; backfill the
    missing `VOICE_API_TOKEN` and `ANTHROPIC_API_KEY` entries as
    placeholders while in the file. **Placeholders only — this file is
    committed.**
- **Verification (all local; the live database must not change):**
  - Record `PantryItem` / `GroceryItem` / `VoiceChange` counts by direct
    Prisma read BEFORE and AFTER the curl suite. They must be identical.
  - With `ALEXA_SKILL_ID` set to a dummy in `.env`, `curl` a realistic
    Alexa envelope against local dev: (a) no signature headers → 400;
    (b) `SignatureCertChainUrl` on a non-Amazon host → 400; (c) plausible
    Amazon cert URL + garbage `Signature-256` → 400; (d) non-JSON body →
    400; (e) `GET /api/alexa` → 405.
  - Confirm from dev-server logs that **Haiku was never called** on any
    rejected path (no parse/apply log lines, no Anthropic request).
  - Regression: `POST /api/voice` with a valid token → 200 `{speech}`;
    with no token → 401. Siri must still work after the proxy edit.
  - Gauntlet: `npx tsc --noEmit` · `npx eslint .` · `npm test` ·
    `npm run build`
- **Evidence required:** the before/after count readings verbatim; each
  curl's status code and body; the log excerpt proving no Haiku call; both
  `/api/voice` regression results; full gauntlet output; the verifier
  package's exports and dependency tree; the `proxy.ts` and `.env.example`
  diffs
- **Done criteria:** counts identical before and after; every attack 4xx;
  no `request.json()` before verification anywhere in the route; no
  `runtime = "edge"`; `.env.example` contains no real secret; Fury reads
  the route top-to-bottom and confirms the gate order
- **Report:** —

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | **PASS** | 0 | 5 (below) |
| 1 | Captain | **PASS** | 0 | 5 (below) |

Budget: 3 passes per gate, then STOP and surface.

### Vision — pass 1 — PASS (no blockers)

Re-ran the whole gauntlet independently: `tsc` clean, `eslint` clean,
`npm test` 52/52, `npm run build` clean with `ƒ /api/alexa` and
`ƒ /api/voice` both in the route manifest.

- **Gate order confirmed line-by-line.** `request.text()` (route.ts:115)
  is the only body read; `request.json()` appears nowhere. Order:
  signature+timestamp (:117-122) → `JSON.parse` (:124-130) →
  `requireSkillId` (:132-138) → `isFromOurSkill` (:140-145) → dispatch.
  `parseTranscript`/`applyActions` exist only inside the `CommandIntent`
  branch, behind all four gates.
- **Fail-closed proven in both directions.** Missing `ALEXA_SKILL_ID` →
  500; a whitespace-only value slips `requireSkillId` but `isFromOurSkill`
  trims and returns false → 400. **There is no path on which an absent or
  empty skill ID results in acceptance.**
- **Attack suite re-run against a fresh server on current code:** all five
  cases 400/405, every 4xx body the *identical* terse
  `{"error":"unauthorised"}` — an attacker learns nothing about which gate
  failed. Server log confirms every rejection died at route.ts:118 (the
  signature verifier), before `JSON.parse`, with zero
  `parseTranscript`/`applyActions`/Anthropic activity anywhere.
- **Zero database writes:** read-only `SELECT count(*)` gave
  `{pantry: 467, grocery: 8, voiceChange: 18}` identical before and after,
  independently matching Stark's numbers.
- **Overclaim audit passed** — the permissible Phase A claim is stated
  exactly in the test header, the mission file, and the route comments; a
  grep for "verified working / proven secure / production ready"-class
  language across every new file found nothing.
- All three of Stark's declared deviations judged sound. Notably (a): the
  `requireSkillId` 500 sits *after* signature verification, so only
  genuinely Amazon-signed traffic could ever observe it — unsigned probes
  still get the uniform 400.

Vision's NOTEs: (1) the `/api/voice` positive control deliberately used an
empty transcript, because a real one invokes Haiku and **writes to the live
family database** — correct danger-register discipline; it still proves the
two things the proxy edit could have broken (request reaches the route, not
307; token gate accepts, not 401). (2) `CLAUDE.md` /
`.claude/settings.local.json` outside boundaries — see Captain NOTE 5,
resolved. (3) **route.ts:197,202 — HELP and USAGE open-session replies
carry no reprompt**, so Alexa falls back to its generic platform reprompt;
valid, just less polished than the launch path. One-line follow-up
candidate for Phase C. (4) `ask-sdk-model` is in the lockfile only
*transitively*; C1's intent (hand-written types, no import) is honored.
(5) Attack (c)'s log line proves the SDK really fetched and validated
Amazon's cert chain rather than short-circuiting.

### Captain — pass 1 — PASS (no written rule violated)

Verified: placement (`src/lib/voice/` is the blessed domain-subdirectory
precedent; the route sits where the layout map puts non-browser Route
Handlers); sizes all well under the 350 soft cap (`alexa.ts` 178,
`alexa.test.ts` 168, `route.ts` 203, model 58); dependency direction
(`alexa.ts` has **zero** imports; the route imports only `next/server`,
the verifier package, and `@/lib/voice/*`); no second definition of
anything on the one-source-of-truth list; naming consistent. Captain
independently confirmed the claimed precedent is real — `match.ts` and
`duplicates.ts` genuinely lack `import "server-only"` while `parse.ts`
and `apply.ts` genuinely carry it.

- **NOTE 1 — `alexa/` placement accepted; STRUCTURE.md needs a row.**
  Data for an external service, hand-copied into Amazon's console, never
  imported by app code — so under `src/` would mislead (implying the
  build consumes it); repo-root `prisma/` is the standing precedent.
  Amendment proposed; Fury to write it in. **ACTIONED.**
- **NOTE 2 — the guarded-action split fits in spirit; wording should
  say so.** The rule names only a Server Action as the guard, but the
  layout map has blessed `/api/voice` as a Route Handler gate since V1,
  and this route is structurally identical: the external calls
  (`parse.ts`, `apply.ts`) stay pure `server-only` with no auth, and the
  caller guards before anything is parsed. Amendment proposed; Fury to
  write it in. **ACTIONED.**
- **NOTE 3 — duplication trend to watch.** The 500-char cap and two
  spoken strings are verbatim from `/api/voice/route.ts`. This is the
  per-file kind STRUCTURE.md explicitly permits (the two routes wrap
  them in incompatible response shapes; the contract specified reusing
  the cap). **If a third voice client appears — the wall tablet is named
  in CLAUDE.md as a future thin client — hoist them into
  `src/lib/voice/` rather than copying a third time.** Recorded as a
  deliberate leftover.
- **NOTE 4 — `ask-sdk-express-adapter` in `dependencies` is correct**,
  not a mistake to move: the verifiers run at request time, so
  `devDependencies` would break the deployed route. The ~28-package
  transitive weight is real but constitutionally unregulated.
- **NOTE 5 — `CLAUDE.md` modified outside both contracts' boundaries.**
  **Resolved by Fury: this is Fury's own edit** from the start of the
  session (marking the handwritten-recipe-card photo-import item done,
  at Bryce's request), predating both contracts. Not a Stark boundary
  breach. Correctly flagged — the foreman should decide whether it rides
  along in a Phase A commit; it is unrelated and should be committed
  separately or deliberately.

## Handoff log

- 2026-08-28 — Mission created from the approved plan. Assembled Stark +
  Vision + Captain (Strange out: no user-visible surface; Banner out:
  research already done). C1 and C2 written; C2 blocked on C1. Next:
  dispatch C1.
- 2026-08-28 — C1 DONE. Fury verified independently: `alexa.ts` has no
  `server-only`, no `process.env` read, no imports at all; slot name
  `command` matches across `alexa.ts` and `interaction-model.json`;
  invocation name `marsh h. q.`; zero `SearchQuery` occurrences. Tests
  33 → 52.
- 2026-08-28 — C2 DONE. Fury read the route top-to-bottom and confirmed
  the gate order: `request.text()` (raw bytes, no `request.json()`) →
  signature + timestamp → `JSON.parse` → `requireSkillId` →
  `isFromOurSkill` → dispatch. `parseTranscript`/`applyActions`
  (route.ts:181-182) are unreachable until every gate passes.
  **Fury's own high-value check — the one bug Phase A's curl suite
  structurally cannot catch:** the route converts Web `Headers` via
  `Object.fromEntries`, which lowercases every key. If the SDK looked up
  `SignatureCertChainUrl` case-sensitively, it would reject *every*
  request including genuine ones — and that failure is indistinguishable
  from correct rejection until Phase C. Verified at source
  (`node_modules/ask-sdk-express-adapter/dist/verifier/index.js:66-74`):
  the SDK lowercases each incoming key before comparing. Safe.
  `.env.example` diff reviewed — all placeholders, no real secret; `.env`
  gitignored and untracked. Next: gates (Vision + Captain, dispatched in
  parallel).
- 2026-08-28 — **Both gates PASS on pass 1, zero blockers** (Vision:
  gauntlet re-run, gate order line-by-line, attack suite re-run, DB counts
  independently read, overclaim audit clean. Captain: no written
  STRUCTURE.md rule violated). Fury actioned Captain's two constitution
  amendments into `STRUCTURE.md`. Mission DELIVERED but **deliberately
  uncommitted** — commits are Bryce's call. Next: Phase B (Bryce creates
  the Amazon developer account; walkthrough is in the plan file).

## Delivery

- **Shipped (built + both gates PASS, but NOT committed):**
  - `src/lib/voice/alexa.ts` (178 lines) — pure helpers, zero imports
  - `src/lib/voice/alexa.test.ts` (168 lines) — 19 tests; suite 33 → 52
  - `src/app/api/alexa/route.ts` (203 lines) — the gated Route Handler
  - `alexa/interaction-model.json` — the committed interaction model
  - `src/proxy.ts` — one `PUBLIC_ROUTES` entry + comment extension
  - `.env.example` — `ALEXA_SKILL_ID` + backfilled `VOICE_API_TOKEN` /
    `ANTHROPIC_API_KEY`, all placeholders
  - `package.json` / `package-lock.json` — widened test glob;
    `ask-sdk-express-adapter@2.14.0`
  - `STRUCTURE.md` — Captain's two amendments (the `alexa/` layout-map
    row; the Route-Handler-as-guard wording)
- **Evidence:** gauntlet green under both Stark and Vision independently
  (`tsc`, `eslint`, `npm test` 52/52, `npm run build`); five-case attack
  suite all 4xx with a uniform terse body; database counts
  `{pantry: 467, grocery: 8, voiceChange: 18}` identical before and after,
  read independently by both Stark and Vision; no Haiku call on any
  rejected path.
- **Shipped check:** `git log origin/main..HEAD` → **empty. Nothing is
  committed and nothing is pushed** — per the harness rule that commits
  happen only when Bryce asks, and the danger register's "never push
  without the user." Everything above is in the working tree.
- **Commit-time caution:** `CLAUDE.md` and `.claude/settings.local.json`
  carry unrelated pre-existing modifications (Fury's handwritten-recipe-
  card doc edit; a local eslint permission entry). Both gates flagged
  these as outside boundaries. **A `git add -A` would sweep them into a
  Phase A commit** — stage deliberately instead.

## Deliberate leftovers

- **Phases B and C of the plan** — the Amazon developer account, the
  console walkthrough, the positive control, the adversarial check
  against a genuinely signed request, and the real-Echo test. All need
  Bryce and a free Amazon developer account. **Phase A cannot and does
  not claim the endpoint works for real Alexa traffic.**
- **Vision NOTE 3** — HELP/USAGE open-session replies carry no reprompt
  (route.ts:197,202); Alexa falls back to its generic platform reprompt.
  Valid, less polished. One-line fix if the simulator's behavior grates
  in Phase C.
- **Captain NOTE 3** — the 500-char cap and two spoken strings are
  duplicated verbatim from `/api/voice/route.ts`. Permitted per-file
  duplication now; **hoist into `src/lib/voice/` if a third voice client
  appears** (the wall tablet is named in CLAUDE.md as a future one).
- **CLAUDE.md's V3 entry is deliberately NOT updated** — V3 is not done,
  only Phase A is. It gets updated at the end of Phase C, per the plan.

## Handoff for the next session

Phase A is complete and gated. The next move is **Phase B**, which is
Bryce-driven: create a free Amazon developer account (checking first which
Amazon account the Echo devices are registered to), create the skill, paste
`alexa/interaction-model.json` into the console's JSON editor, point the
endpoint at `https://family-hub-xi-fawn.vercel.app/api/alexa`, then copy
the skill ID into Vercel's env vars as `ALEXA_SKILL_ID` and redeploy. The
full click-by-click walkthrough is in the plan at
`/Users/brycemarsh/.claude/plans/ancient-discovering-sutherland.md`.

Until `ALEXA_SKILL_ID` is set, `/api/alexa` rejects everything including
genuine Amazon traffic — that is the intended fail-closed state, not a bug.
