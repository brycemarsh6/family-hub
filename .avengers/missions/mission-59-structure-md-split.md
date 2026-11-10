# Mission 59: split STRUCTURE.md's long feature entries into companion files

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (Bryce took D1 to D4, 2026-11-09)
**Started:** 2026-11-09 · **Updated:** 2026-11-09

## Brief

- **Goal:** STRUCTURE.md is 1,770 lines (`wc -l` on `main` at `e62056c`),
  13 under its own 1,783 cleanup trigger. Mission 54 already moved the
  stories out, so another stories pass would save 10 to 20 lines (mission
  58, C0). Bryce approved the bigger fix on 2026-11-09 as its own PR: move
  the long per-feature "One source of truth" entries into smaller linked
  companion files, without changing what any rule says.
- **Number:** 59. Mission 58 is already taken by three in-flight sessions
  (screensaver S2, calendar sync PR 3, text size), so this one skips it.
- **Done means:** (1) STRUCTURE.md is much shorter (about 790 lines
  measured from the plan below); (2) `movecheck.mjs` (below) reports every
  companion chunk found verbatim once in the old file, and the old file
  minus moved chunks equals the new file minus pointers, with only the
  sanctioned edits left; (3) every moved entry keeps its bold headline in
  STRUCTURE.md plus one pointer naming the companion heading; (4) every
  amendment id and decision number that was in STRUCTURE.md is still in
  STRUCTURE.md or a companion; (5) every section name other files cite
  ("Wide pages", "Wide pages rule 1", "Slideshow photos", "Google calendar
  link", "One source of truth", the chrome-dimension rule, "optimistic tap
  wrapper", the layout map) still lands; (6) the Gauntlet is green; (7)
  Captain and Vision PASS; (8) merged, production deploy checked.
- **Out of scope:** changing what any rule says; renumbering Wide pages
  rules 1 to 4; editing source-code comments that cite STRUCTURE.md (the
  pointer is where they land); the pending Captain amendments in older
  mission files; any code, database or `.env` change; the generic agent
  files in `~/.claude/agents/`.

## Plan (for Bryce, before anything moves)

**What moves** (each entry's bold headline stays; everything after it
moves word for word):

| Entry in "One source of truth" | Lines | Companion file |
|---|---|---|
| Wide pages (mission-44) | 237 | `docs/structure/layout.md` |
| A measured dimension of app chrome | 58 | `docs/structure/layout.md` |
| Plans & Goals scope, recap and check-in history | 158 | `docs/structure/plans-goals.md` |
| Slideshow photos (mission-57) | 143 | `docs/structure/slideshow.md` |
| `useOptimisticRun.ts`, the optimistic tap wrapper | 111 | `docs/structure/optimistic-taps.md` |
| Habits & Chores PR B, C, D, E2, F homes | 235 | `docs/structure/habits.md` |
| Google calendar link and copying events to Google | 66 | `docs/structure/calendar-sync.md` |

Total moved: about 1,008 lines. STRUCTURE.md lands near 790.

**What stays:** every other entry and section unchanged; for each moved
entry, its bold headline (word for word) and a pointer
`(Rules: docs/structure/<file>.md, "<heading>".)`.

**New text (the only sanctioned edits):**
- One sentence under "One source of truth": entries with a `(Rules: …)`
  pointer continue in that companion file, which binds exactly like this
  file; search STRUCTURE.md and `docs/structure/` together for a name or id.
- One sentence in the header paragraph saying the same for readers.
- Each companion opens with a 3-line intro (what it is, that it binds, cut
  from `e62056c` by mission 59), then `## One source of truth` and one
  `###` heading per entry (headings are new text; bodies are moved text).
- The housekeeping note: numbers updated (1,770 before mission 59, N
  after; due again 200 lines above N) and, if Bryce takes D3, the new rule.

## Decisions for Bryce (D1 to D4): Bryce took the recommendation on all four, 2026-11-09

- **D1. Which entries move.** (a) **Recommended:** the seven rows above,
  to about 790 lines. They are the long, single-feature inventories;
  every cross-feature rule stays. (b) Also move the medium ones (Winnie,
  briefing, feedback, tablet, household people: about 100 lines more, to
  about 690), at the cost of four more small files to open.
- **D2. Folder and names:** `docs/structure/<feature>.md`, one file per
  feature, named as in the table. **Recommended** (beside
  `docs/history/`, so docs stay in one tree; named by feature so an agent
  working on habits knows to open `habits.md`).
- **D3. A rule so it doesn't regrow.** Add to the housekeeping note: "A
  new One source of truth entry for one feature that runs past 15 lines
  goes in that feature's companion file, with its headline and pointer
  here." **Recommended**, otherwise the file is back at 1,700 in a few
  months. This is new rule text, so it is your call.
- **D4. How agents know.** Captain, Vision and Stark always read
  STRUCTURE.md, so the pointer and the two new sentences are what tells
  them. **Recommended:** no edits to the agent files (they are generic,
  used in every project). Each contract that touches a feature names its
  companion file.

Decided by Fury (structure and tooling):
- **Pointer form:** `(Rules: docs/structure/<file>.md, "<heading>".)`,
  placed right after the kept bold headline. It names the heading, never
  a count.
- **The checker:** a mission-59 copy of mission 54's `movecheck.mjs`,
  taking many companion files and stripping `(Rules: docs/structure/…)`
  pointers. Self-tested 2026-11-09: a verbatim move passes; a one-word
  change fails; two companions each with an intro pass. Path:
  `/private/tmp/claude-501/-Users-brycemarsh-Developer-family-hub--claude-worktrees-dashboard-w2-calendar-widget-40bbe6/3bf1bab0-19e8-458c-9a0f-6d8b75e1cf8f/scratchpad/movecheck.mjs`.
  Not committed (docs-only PR).
- **S2 coordination:** S2 (mission 58, `claude/screensaver-s2-slideshow`)
  had not touched STRUCTURE.md at `a8c0615`. Sync with `main` right before
  merge; if S2 merged first with a long screensaver entry, it moves too.

## Danger register

From AGENTS.md, absolute for every agent:
- Never `git add -A` or `git add .`; stage by explicit path; `git show
  --stat HEAD` after every commit.
- Direct pushes to `main` are blocked; branch → PR → Gauntlet green →
  merge. Fury alone runs git. Stark and the gates never commit or push.
- No agent edits `.env`, runs `db:seed` / `db:reset`, or touches the
  database. This mission edits markdown only.

## Gauntlet

- `npx tsc --noEmit`, `npx eslint .`, `npm test`, `npm run build`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- This mission's check: `git show e62056c:STRUCTURE.md > <scratchpad>/structure-old.md`,
  then `node <scratchpad>/movecheck.mjs <scratchpad>/structure-old.md STRUCTURE.md docs/structure/*.md --allow-diff`.
  Expected: zero `FAIL` lines; the `DIFF` block lists only the words of
  the sanctioned edits.

## Assembled

- **Stark** (builder): markdown files only.
- **Vision** (correctness): re-runs the checker and Gauntlet, hunts for a
  moved normative sentence that lost its context, a pointer whose heading
  does not exist, a cited name or id that no longer lands.
- **Captain** (structure): his constitution. Checks every rule still
  binds, the pointers land, the housekeeping note is accurate.
- **Strange: out.** Nothing a person sees changes.
- **Banner: out.** Fury mapped the section himself.

## Contracts

### C1 - Move seven feature entries word for word into `docs/structure/`, leaving headline plus pointer

**Objective:** move the text of 11 One source of truth entries (the seven
plan rows; Habits is five entries) from STRUCTURE.md into six new
companion files, word for word, keeping each entry's headline and adding
one pointer, plus the four sanctioned text edits below.

**Boundaries:** may touch `STRUCTURE.md`, new `docs/structure/layout.md`, new `docs/structure/plans-goals.md`, new `docs/structure/slideshow.md`, new `docs/structure/optimistic-taps.md`, new `docs/structure/habits.md`, new `docs/structure/calendar-sync.md` · must not touch `CLAUDE.md`, `AGENTS.md`, `.avengers/status.md`, `docs/history/structure-rationale.md`, `src/`. No git commands.
- **Verification and evidence:** listed after the moves, below.

**The moves:** (line numbers are `STRUCTURE.md` at `e62056c`; each entry
runs from its `- **` line to the line before the next top-level `- **`
line; re-confirm each range before cutting):

| Lines | Entry | Kept in STRUCTURE.md (word for word, then the pointer) | Companion, `###` heading |
|---|---|---|---|
| 268-378 | optimistic tap wrapper | the whole first sentence, through `` `SAVE_FAILED` message). `` | `optimistic-taps.md`, "The optimistic tap wrapper" |
| 379-536 | Plans & Goals | `**Plans & Goals scope, recap and check-in history (mission-29).**` | `plans-goals.md`, "Plans & Goals scope, recap and check-in history" |
| 581-605 | Habits PR B | `**Habits & Chores PR B homes (mission-31).**` | `habits.md`, "Habits & Chores PR B homes" |
| 684-826 | Slideshow | `**Slideshow photos (mission-57).**` | `slideshow.md`, "Slideshow photos" |
| 827-865 | Habits PR C | `**Habits & Chores PR C homes (mission-32).**` | `habits.md`, "Habits & Chores PR C homes" |
| 866-906 | Habits PR D | `**Habits & Chores PR D homes (mission-33).**` | `habits.md`, "Habits & Chores PR D homes" |
| 907-944 | Habits PR E2 | `**Habits & Chores PR E2 homes (mission-35).**` | `habits.md`, "Habits & Chores PR E2 homes" |
| 945-1036 | Habits PR F | `**Habits & Chores PR F homes (mission-36).**` | `habits.md`, "Habits & Chores PR F homes" |
| 1130-1366 | Wide pages | `**Wide pages (mission-44, the iPad landscape plan).**` | `layout.md`, "Wide pages" |
| 1367-1424 | chrome dimension | through `**a second hardcoded copy is not.**` | `layout.md`, "A measured dimension of app chrome" |
| 1477-1541 | Google calendar | `**Google calendar link (mission-55) and copying events to Google (mission-56).**` | `calendar-sync.md`, "Google calendar link and copying events to Google" |

Everything after the kept text, to the end of the entry, moves. The kept
line in STRUCTURE.md becomes `- <kept text> (Rules: docs/structure/<file>.md, "<heading>".)`
(re-wrapped to about 78 columns). Moved text is pasted unchanged; line
re-wrapping is allowed (the checker ignores whitespace), nothing else.
Indented sub-lists and blank lines inside an entry keep their shape.
Any `(Story: docs/history/structure-rationale.md, ...)` pointer inside a
moved body moves with it unchanged.

**Companion file shape** (new text only in the intro and headings):
```
# STRUCTURE.md companion: <Feature>

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list,
cut from it word for word at commit e62056c on 2026-11-09 by mission 59.
Every rule here binds exactly like STRUCTURE.md; a second definition is a
BLOCKER. Each entry continues the bold headline kept in STRUCTURE.md.

## One source of truth

### <heading>

<moved body>
```
Features: Layout (`layout.md`), Plans & Goals, Slideshow photos,
Optimistic taps, Habits & Chores, Calendar sync. Entries in a file keep
STRUCTURE.md's order.

**The four sanctioned edits** (exact words; nothing else in STRUCTURE.md
changes):
1. Header paragraph: after "a rule here keeps a one-line pointer." add:
   "The long single-feature entries under One source of truth continue in
   companion files in docs/structure/, one per feature; the text there
   binds exactly like this file, and the entry here keeps its headline and
   a one-line pointer."
2. Under "Adding a second definition of any of these is a BLOCKER:" add a
   new paragraph before the list: "An entry that ends in a pointer to
   docs/structure/ continues in that companion file, and the text there is
   part of this list. Search STRUCTURE.md and docs/structure/ together for
   a name, decision number or amendment id."
3. Housekeeping note: replace "1,676 before the 2026-11-08 pass
   (mission-54), 1,583 after." with "1,676 before the 2026-11-08 pass
   (mission-54), 1,583 after; 1,770 before the 2026-11-09 split
   (mission-59), N after. A new One source of truth entry for one feature
   that runs past 15 lines goes in that feature's companion file in
   docs/structure/, with its headline and pointer here." (N = final
   `wc -l STRUCTURE.md`, measured last.)
4. The housekeeping note's tag: "Reworded 2026-11-08, mission-54, Bryce
   approved.)" becomes "Reworded 2026-11-08, mission-54, Bryce approved.
   Widened 2026-11-09, mission-59, Bryce approved.)"

**Verification:**
- `git show e62056c:STRUCTURE.md > <scratchpad>/structure-old.md`, then
  `node <checker> <scratchpad>/structure-old.md STRUCTURE.md docs/structure/*.md --allow-diff`
  (checker path under "Decided by Fury"). Expected: zero `FAIL`; 11
  pointers removed; 11 companion `###` chunks plus 6 `##` headings with no
  body; DIFF lines are only the words of edits 1 to 4.
- `grep -c '(Rules: docs/structure/' STRUCTURE.md` → 11; each named
  heading exists as `### <heading>` in the named file.
- Every amendment id and `decision NNN` in the old file is in
  STRUCTURE.md or `docs/structure/` (compare sorted unique lists:
  `grep -oE 'A-?[A-Z0-9]*-?[0-9]+|A[0-9]+|decisions? [0-9]+'`).
- `wc -l STRUCTURE.md docs/structure/*.md`.

**Evidence required:** the checker's full output; the pointer and heading
check; the id comparison (old list, new list, `comm -3` empty); the line
counts; and an "Unsure" list for any cut you were not sure of.

**Done criteria:** Fury re-runs the checker and gets zero FAIL with only
sanctioned DIFF words; STRUCTURE.md is about 790 lines.

## Gate ledger

## Handoff log

- 2026-11-09 (Fury, Opus 5.5): branch `claude/structure-md-split` from
  `origin/main` `e62056c`. Measured STRUCTURE.md 1,770 lines; mapped the
  One source of truth section entry by entry; wrote and self-tested the
  checker. Plan written; waiting on Bryce's D1 to D4.
- 2026-11-09 (Fury): Bryce took all four recommendations. C1 written. Preflight: 0 hard failures but one, STRUCTURE.md over the
  650 code cap, the same false positive mission 54 recorded (the caps
  exempt documents). Dispatching Stark.
  Fury edits the two record lines himself (CLAUDE.md's S2 status line
  about the cleanup pass; `.avengers/status.md`'s STRUCTURE.md line).

## Delivery
