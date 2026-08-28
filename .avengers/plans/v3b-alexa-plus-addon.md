# V3b — Marshee as an Alexa+ add-on (MCP)

## Context

V3's classic Alexa skill shipped its Phase A (the `/api/alexa` endpoint —
built, gated, both Avengers gates PASS, deployed) and Phase B (skill
"Marshee" created in the developer console, model built, endpoint
configured). Then the real-Echo test failed with "launching marshee isn't
supported on this device," and the cause is now established: **the
household's account is on Alexa+ (auto-upgraded via Prime), and Alexa+
does not run classic custom skills.** The family *likes* Alexa+ and wants
to keep it, so opting out is off the table.

Amazon's replacement for skills on Alexa+ is **add-ons**: the developer
runs an **MCP server** (Streamable HTTP), registers it via the Alexa AI
CLI, and *Alexa+'s own AI reasoning decides when to call the tools based
on what the customer says* — no invocation name. That last part removes
the documented classic-skill limitation ("must say *tell marshee*"): the
family may be able to just say "Alexa, I used two hot dogs."

**Why this path is architecturally sweet for this codebase:** Alexa+ does
the language understanding and calls tools with structured arguments — so
this client needs **no Haiku parse at all**. Tools construct
`ParsedAction` objects directly and call the existing `applyActions()`
(`src/lib/voice/apply.ts`) — the same matcher, undo log, and spoken-reply
machinery Siri uses, unchanged. "One voice backend, thin clients on top"
holds for a third time, and this thin client is the thinnest yet, with
**zero Anthropic cost per Alexa command**.

## Research findings (2026-08-28, cited from Amazon's docs)

- **Add-on = MCP server** over Streamable HTTP; tools carry JSON Schema;
  Alexa+ decides invocation from customer intent (mcp-toolkit-overview).
- **Lifecycle:** `alexa-ai configure` → `alexa-ai new mcp` → edit
  `addon.json` → `alexa-ai deploy` → **development stage**, testable via
  web simulator *and* physical device → `alexa-ai submit` only for public
  certification, which we never do (mcp-toolkit-quickstart). Amazon ships
  an **Add-on Agent Skill** that runs in Claude Code to automate
  onboarding.
- **Account linking is optional** in general, but tools that perform
  write actions on user data are exactly the case it exists for. If used:
  OAuth 2.1 PKCE (S256); third-party providers explicitly supported —
  **Login with Amazon** included; the MCP server must host a Protected
  Resource Metadata document at `/.well-known/oauth-protected-resource`,
  return 401 unauthenticated, and validate bearer tokens. The server does
  NOT need its own token endpoint — the provider handles that
  (category-sdk-mcp-account-linking).
- **⚠️ THE ONE REAL UNKNOWN — access.** The marketing page says "Alexa+
  for Builders is currently available to select partners working directly
  with our team." The docs/quickstart read fully self-serve, and Bryce's
  developer console home *shows* an "Alexa+ Developer Console — create
  and manage your add-on" tile. The `alexa-ai` CLI is not on public npm
  (download presumably via the console). Which signal wins is **only
  answerable empirically** — hence Phase B0 below. No code gets written
  before that gate passes.
- **Costs:** none documented anywhere for add-on development; Alexa+
  itself is included with the household's Prime. This path also
  *removes* the per-command Haiku cost the classic skill would have had.
- `mcp-handler` (npm, v2.1.1 verified) — "framework-agnostic HTTP adapter
  for MCP servers," the Vercel-maintained way to host an MCP server
  inside a Next.js App Router app. Streamable HTTP support to be
  confirmed at build time per AGENTS.md discipline.

## Security design (settled — the part that must not be improvised)

The MCP endpoint is a public URL on Vercel that can write to the live
family database. The danger-register rule stands: public endpoints get
real auth, proven adversarially.

- **No-auth is unacceptable** here: without account linking Alexa+ sends
  no token, so the tools would be open to the internet.
- **Chosen design: account linking with Login with Amazon (LWA).** The
  family links once, using the Amazon account they already have. Our
  server then: requires `Authorization: Bearer …` on every MCP call →
  validates the token against LWA's tokeninfo/profile endpoint → and
  **checks the Amazon user id against an env-var allowlist**
  (`ALEXA_ALLOWED_USER_IDS`). LWA is the authorization server; we build
  no OAuth server — only token *validation* plus a small static PRM
  JSON route. A stranger linking their own Amazon account passes OAuth
  but fails the allowlist: 403, nothing written.
- Token validation results cached briefly in-memory per instance to
  avoid an LWA round trip per tool call (same perf reasoning as the
  pinned-region work).
- `proxy.ts` gains **exact** public entries for the MCP route and
  `/.well-known/oauth-protected-resource` — narrow, per the R4/C8 drills.

## What happens to the classic-skill work

- `/api/alexa` **stays, documented as dormant** — proven, gated,
  harmless, and useful if a non-Alexa+ device ever appears in the house
  (or Amazon changes course). Its **temporary header-name diagnostic
  logging must be reverted** — that's a loose end from the debugging
  session regardless of this plan.
- The "Marshee" classic skill stays parked in the console (Test can be
  switched Off). `ALEXA_SKILL_ID` stays in Vercel — harmless, and the
  dormant route still uses it if ever hit.
- CLAUDE.md's V3 record gets the honest ending: classic skill blocked by
  the Alexa+ migration, superseded by V3b.

## The phases

### B0. Feasibility gate — Bryce + Claude, ~30 min, no code

1. Developer console home → the **alexa+** section → **Alexa+ Developer
   Console**. Does it let Bryce in, or show a partner-gate/waitlist?
2. If in: find the Alexa AI CLI download (expected in the console or the
   quickstart), install, run `alexa-ai configure` against his account.
3. Check for Amazon's **Add-on Agent Skill** for Claude Code; install if
   available — it becomes the implementing session's guide.
4. **Independent cleanup, same session:** revert the temporary
   header-names diagnostic in `src/app/api/alexa/route.ts` (commit,
   push).

**Gate:** `alexa-ai configure` authenticating successfully = GO. A
partner wall = STOP: record the blocker in CLAUDE.md, keep Siri as the
working voice path, and present the fallback menu (interest form/wait;
per-device opt-out if Amazon offers it; park V3b).

### B1. The MCP server — Avengers mission (Stark + Vision + Captain)

New thin client over the existing backend, in the existing app:

- **Route:** an MCP endpoint (path per `mcp-handler`'s convention —
  likely `src/app/api/mcp/[transport]/route.ts`; confirm against the
  package's docs in `node_modules` per AGENTS.md). Node runtime.
- **Tools** (each schema'd, each returning the spoken-style sentence
  `applyActions` produces — the functional requirements literally ask
  for user-friendly text):
  - `use_item(item, quantity)` → `applyActions([{action:"use",…}])`
  - `add_item(item, quantity)` → action `add`
  - `add_to_shopping_list(item, quantity)` → action `buy`
  - `undo_last_change()` → action `undo`
  - `check_stock(item)` — optional fifth tool, read-only, new but cheap:
    `matchItem` against the pantry, answer "You have 3 Hot dogs." Big
    kitchen value ("do we have hot dogs?"); include unless it bloats.
  - **No Haiku call anywhere on this path.**
- **Auth layer:** bearer-token gate before any tool executes — LWA
  tokeninfo validation + user-id allowlist + short in-memory cache; the
  PRM document route; 401/403 discipline per the docs.
- **Env vars:** `ALEXA_ALLOWED_USER_IDS` (+ whatever LWA validation
  needs — client id; determined in B0/B1 from the CLI's
  configure-account-linking requirements). Placeholders in
  `.env.example`, real values in `.env`/Vercel only.
- **proxy.ts:** the two exact public entries.
- **Tests:** unit tests for the tool→ParsedAction mapping and the
  allowlist gate, house `node:test` style, wired into `npm test`.
- **Local verification:** Amazon's **Local Inspector** + curl: no token
  → 401 with `WWW-Authenticate`; garbage token → 401; valid-shaped
  token for a non-allowlisted user → 403; DB counts identical before
  and after; gauntlet clean. Same honest limit as V3 Phase A: a real
  Alexa+ call can't be simulated locally — the positive control is B3.

### B2. Register the add-on — Bryce-driven walkthrough

LWA security profile in the developer console (Bryce creates,
walkthrough-style; client id/secret → Vercel env vars, never chat/git).
Then `alexa-ai new mcp --name "Marshee" …` → `addon.json` review
(description + example utterances are what Alexa+'s reasoning matches
against — write them for the kitchen: "I used two hot dogs", "add milk
to the shopping list", "do we have eggs") → `alexa-ai
configure-account-linking` (CLI validates PKCE S256 support) →
`alexa-ai deploy` to the development stage. **Never `alexa-ai submit`.**

### B3. Positive control, adversarial check, real Echo — attended

House methodology, same as every prior public surface:
1. **Positive control:** web simulator → link the account → "I used two
   ZZZ test hot dogs" → verify the *database moved* (direct Prisma
   read), not just the reply. Then the real kitchen Echo, spoken.
2. **The no-invocation-name question answered empirically:** does plain
   "Alexa, I used…" route to the add-on, or does it need "ask Marshee"?
   Record whichever is true in CLAUDE.md — it sets the family's habit.
3. **Attacks, DB counts before/after each:** no token; forged/expired
   token; valid OAuth from a *different* Amazon account (second
   household account if available — the allowlist's real test) → 403.
4. **Regressions:** Siri `/api/voice` (positive + negative), app pages
   signed-out 307, `/api/alexa` still gated.
5. Cleanup ZZZ rows to exact baseline; docs (CLAUDE.md V3b record,
   README env vars); `git log origin/main..HEAD` before calling it live.

## Out of scope

- Certifying/publishing the add-on (never — private family tool).
- Removing `/api/alexa` or the Haiku parse path (`/api/voice` still
  needs it for Siri).
- Any new voice verbs beyond the four (+optional stock check) — V4
  territory.
- The Marsh HQ → Marshee in-app rename (separate queued task).

## Risks

- **B0 partner gate** — the plan's whole reason for a feasibility phase;
  zero code is at risk if it fails.
- **Preview-program churn:** docs updated July 2026; CLI flags and
  requirements may shift under us. Mitigation: the Add-on Agent Skill
  (if installable) as the live source of truth, docs re-checked at build
  time, AGENTS.md discipline.
- **LWA PKCE S256 support** claimed by Amazon's own docs but verified at
  `configure-account-linking` time (the CLI checks it for us).
- **Alexa+ tool-call latency/UX** is unmeasured until B3 — it's an LLM
  assistant orchestrating tool calls; if it's slow or chatty, that's
  Amazon-side and we record it honestly.
