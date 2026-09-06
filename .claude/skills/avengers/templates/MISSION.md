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

## Fury's pre-dispatch checklist

Mechanical, because these are the failures that recur under load — every
one below is a real incident from missions 13-15, and every one was
*known* at the time and simply not applied on turn 200.

**Before writing a contract:**
- [ ] **Grep what a file exports before forbidding it.** Twice a contract
      said "must not touch X" where X already did the job being asked for,
      so a builder duplicated it and the original went dead. A negative
      claim ("X was never built") needs the same check as a positive one.
- [ ] **No two parallel contracts may name the same file.** Overlapping
      boundaries produce merge chaos no gate can untangle. If they must
      share, run them sequentially.
- [ ] **Ask which file the fix actually lives in — not just which file the
      symptom is in.** A scroll-after-navigation bug lived in the navigation
      hook, not the view that showed it; the boundary named the view, so a
      builder who had proven the one-line fix by experiment had to revert it
      and stop. Third boundary error of one mission, and grepping exports
      would not have caught it: trace the call path from the symptom to the
      code that decides the behaviour, and put *that* file in the boundary.

**Before dispatching:**
- [ ] **The contract is written in the mission file, not only the prompt.**
      A boundary living only in a dispatch prompt is not a boundary — a
      gate auditing scope has nothing to audit against. Filed by a gate
      twice and by a *builder* once.
- [ ] **Re-measure any number in the dispatch.** Line counts quoted from a
      builder's report describe the tree at report time, not the tree you
      are dispatching against.
- [ ] **Quote the real HEAD — as the LAST thing before dispatch.**
      `git rev-parse --short HEAD` *after* every commit is done, never
      before. Reading it first and then committing a record moved it twice
      in one mission, both times after this item already existed. An
      amended or superseded hash sends a gate at a tree that does not exist.

**After committing:**
- [ ] **`git show --stat HEAD`.** If `git add` names a path that no longer
      exists it aborts the *whole* staging operation, and the commit records
      a rename with zero content — which looks exactly like success.

**While a gate is running:**
- [ ] **Do not commit, and do not dispatch a fix.** A fix landing during a
      gate leaves its verdict covering a tree that no longer exists. Batch
      fixes; re-gate after.

**At the end of every report to the user:**
- [ ] **Something is dispatched, or the report says nothing is queued and
      why.** Twice in one session the user had to ask "who is working?" and
      the answer was nobody — the next step had been described accurately
      and then not taken. Describing the step is not taking it.

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
