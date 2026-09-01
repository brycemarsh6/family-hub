# Mission: <name>

**Project:** <repo>
**Status:** INTERROGATING | CONTRACTED | BUILDING | AT-THE-GATES | DELIVERED | STOPPED (<why>)
**Started:** <date> · **Updated:** <date — keep current; this file is the handoff artifact>

## Brief

- **Goal:** <one paragraph>
- **Done means:** <observable, testable statement>
- **Out of scope:** <explicit list>

## Danger register

<From CLAUDE.md + user interview. Absolute for every agent. Example entries:>
- <command or action that must never run, and why>
- <data that is live/shared, and what protects it>

## Gauntlet

<The exact commands that must pass, e.g.:>
- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `npm run build`

## Assembled

- Stark + Vision (always)
- <Strange? Captain? Banner? — and the one-line reason each is in or out>

## Contracts

### C1 — <objective, one sentence>
- **Status:** PENDING | DISPATCHED | DONE | FAILED | BLOCKED-ON-CONTRACT
- **Boundaries:** may touch: <paths> · must not touch: <paths>
- **Verification:** <exact commands → expected outcomes>
- **Evidence required:** <what the report must contain>
- **Done criteria:** <how the foreman knows without trusting the builder>
- **Report:** <summary + pointer once Stark reports>

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | — | — | — |

<Full verdicts appended below the table or linked. Budget: 3 passes per gate, then STOP and surface.>

## Handoff log

<Append-only. One line per state change, newest last. A fresh session resumes from here.>
- <date/time> — <what happened, what's next>

## Delivery

- **Shipped:** <what, with evidence pointers>
- **Shipped check:** `git log origin/main..HEAD` → <result — local-only commits listed, or clean>
- **Deliberate leftovers:** <notes from gates, deferred items>
