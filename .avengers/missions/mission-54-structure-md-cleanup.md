# Mission 54: STRUCTURE.md housekeeping (stories out, rules stay)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (plan approved by Bryce 2026-11-08: D1 stories only, D2 the +200 trigger, D3 Size watch stays)
**Started:** 2026-11-08 · **Updated:** 2026-11-08 (Fury, plan)
**Branch:** `claude/structure-md-cleanup-0b5cc7`, cut from `main` at `7dc5b28` (0 ahead, 0 behind at plan time)

## Brief

- **Goal:** STRUCTURE.md has grown past the housekeeping trigger it set for
  itself (its File-size caps section says: past 650 lines, move the
  provenance narratives into `docs/history/structure-rationale.md`, leaving
  each rule's binding text and a one-line pointer). Do that pass: move every
  provenance story word for word into the new history file, keep every rule
  where it is, and leave a pointer behind each rule that lost its story.
- **Measured first (Bryce asked):** STRUCTURE.md is **1,676 lines** (`wc -l`) on
  `main` at `7dc5b28` (CLAUDE.md still says 1,534). It was 737 lines on
  2026-11-04 (mission-27's Captain pass). The 940 lines added since are
  almost all **rule inventories** from the habits, dashboard and iPad
  landscape missions (which file is the only home of which rule), not
  stories.
- **Fury's finding, before any contract:** reading the whole file, the
  provenance stories (instances, corrections, "this exists because",
  "moved in mission-N", amendment histories) come to roughly **250 to 300
  lines**. Everything else is binding text, instance lists, grandfathered
  debt lists, dependency-direction lists and pending clauses. So moving
  stories alone lands the file near **1,350 to 1,450 lines**, not 650. The
  650 target is reachable only by moving rules out of STRUCTURE.md, which
  the brief forbids ("Rules stay in STRUCTURE.md"). This goes to Bryce as
  decision D1 below.
- **Done means:** (1) `docs/history/structure-rationale.md` exists and
  holds every moved passage word for word, under the same section and
  rule names as STRUCTURE.md, in STRUCTURE.md's order; (2) `movecheck.mjs`
  (below) reports every archive chunk found verbatim once in the old file
  and the old file minus moved chunks equals the new file minus pointers,
  with the only remaining differences being the two sanctioned edits (the
  header paragraph and the housekeeping note); (3) every rule that lost
  text carries a one-line pointer naming the archive heading; (4) every
  amendment id that was in STRUCTURE.md (`A-L5-6`, `A-48-1`, `A7`, …) is
  still greppable in STRUCTURE.md; (5) every section name other files
  point at ("Wide pages", the guard-form rule, the adoption clause, the
  concern-split clause, the chrome-dimension rule, the per-member-
  difference clause, the layout map, One source of truth) still exists
  with the same name; (6) the Gauntlet is green; (7) CLAUDE.md's one
  "Open, not scheduled" line about STRUCTURE.md and the Current status
  date are updated and nothing else in CLAUDE.md changes.
- **Out of scope:** changing what any rule says; renumbering the Wide
  pages rules 1 to 4 (source comments cite "rule 1", "rule 2"); the
  pending Captain amendments that still wait in mission files (mission 44
  A1 to A4, mission 45 A5 to A9, mission 47 A11 to A14, mission 50 A17 to
  A20: adding them would change rules); DESIGN.md; any code, database or
  `.env` change; splitting STRUCTURE.md into companion rule files (D1,
  option b, only if Bryce picks it, and then as its own later mission).

## Danger register

From AGENTS.md, absolute for every agent:
- Never `git add -A` or `git add .`; stage by explicit path; `git show
  --stat HEAD` after every commit.
- Direct pushes to `main` are blocked; branch → PR → Gauntlet green →
  merge. Fury alone runs git. Stark and the gates never commit or push.
- No agent edits `.env`, runs `db:seed` / `db:reset`, or touches the
  database. This mission needs none of that: it edits three markdown
  files.
- The test script pins `TZ=America/Denver`; the UTC run is the direct
  `TZ=UTC node --import tsx --test …` command below.

## Gauntlet

Docs only, but the project requires it before every merge:
- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
- `npm run build`

Plus this mission's own check, run by Stark (evidence) and re-run by
Vision and Captain (verification):
- `node <scratchpad>/movecheck.mjs <(git show 7dc5b28:STRUCTURE.md) STRUCTURE.md docs/history/structure-rationale.md --allow-diff`
  (in practice: `git show 7dc5b28:STRUCTURE.md > /tmp/structure-old.md`
  first, then pass that path). Expected: zero `FAIL` lines; the `DIFF`
  block lists only the words of the two sanctioned edits.
- Scratchpad path of the checker (Fury wrote and self-tested it 2026-11-08):
  `/private/tmp/claude-501/-Users-brycemarsh-Developer-family-hub--claude-worktrees-dashboard-w2-calendar-widget-40bbe6/fe9cb1f6-f283-439d-8d98-fd293b756b98/scratchpad/movecheck.mjs`.
  It is not committed (Bryce: no code in this PR). If it is wanted for
  the next pass, it belongs beside `recordcheck.mjs` in
  `.claude/skills/avengers/`.

## Assembled

- **Stark** (builder): one contract, three markdown files.
- **Vision** (correctness): re-runs the checker and the Gauntlet, audits
  the diff against the boundaries, hunts for a moved chunk that carried a
  normative sentence, a pointer whose heading does not exist, a
  cross-reference that no longer lands.
- **Captain** (structure): this is his constitution. He rules on the
  rule-versus-story line for every passage Stark marked "unsure", checks
  every rule is still present and unchanged, and checks the housekeeping
  note is accurate.
- **Strange: out.** Nothing a person sees changes.
- **Banner: out.** Fury read STRUCTURE.md in full on Fable; the file is
  the codebase here.

## Decisions (D1 to D3): Bryce took the recommendation on all three, 2026-11-08

- **D1. The target.** (a) **Recommended:** move stories only, touch no
  rule, accept a result near 1,350 to 1,450 lines, and report the honest
  number. (b) Also move the long per-domain rule inventories (the habits
  PR B to F homes, the dashboard widgets entry, Wide pages) into
  companion files that STRUCTURE.md links. That reaches about 650 but
  moves rules out of STRUCTURE.md, against the brief, and every agent
  would then need to read several files; it would be its own mission.
  (c) Stop here, no PR.
- **D2. The housekeeping note.** The note says the pass is due "past 650
  lines". After this pass that sentence would still be true and the pass
  would still read as due, which is false. Proposed replacement wording
  (the only rule text this mission rewrites, and Bryce asked for it to be
  accurate): see C1's spec. The trigger becomes "200 lines above the count
  recorded at the last pass". **Recommended.** The alternative is to keep
  650 as written and accept that it reads as permanently overdue.
- **D3. "Size watch" snapshots** (the line counts of `habitVocabulary.ts`,
  `ScheduleView.tsx` and so on, with the seam each one splits at).
  **Recommended: keep them in STRUCTURE.md.** They are Captain's live
  gating data, not history, and each count sits in the same sentence as
  its split seam, which is an instruction. Moving them saves about 25
  lines and Captain re-measures them every pass anyway.

Decided by Fury (structure and tooling, Bryce's standing split):
- **Pointer form:** a separate parenthetical, after the rule's existing
  provenance tag, which stays untouched:
  `(Story: docs/history/structure-rationale.md, "<archive heading>".)`
  Naming the heading follows "name the item, never count into it"; a
  bare pointer would go stale the first time the archive is reordered.
- **Archive layout:** `docs/history/structure-rationale.md` opens with a
  short intro (what it is, which commit it was cut from, how to read a
  pointer), then one `##` per STRUCTURE.md section and one `###` per rule
  that lost text, in STRUCTURE.md order. Headings are new text (the
  checker skips them); every body line is moved text.
- **No whole-file snapshot.** The 2026-10-31 CLAUDE.md archive was a
  snapshot because CLAUDE.md was rewritten; here nothing is rewritten and
  git holds the old file at `7dc5b28`. The archive intro cites that hash.

## The move rules (Stark applies them; Captain rules on the edge cases)

**Moves to the archive** (cut at sentence or parenthetical boundaries,
never mid-sentence; the moved text is pasted unchanged, re-wrapping
aside):
1. **Instances and stories:** "Instance: …", "First instance: …",
   "Recorded 2026-…: …", "This exists because …", "This rule exists
   because …", "That placement is not cosmetic: …", "Note what changed
   its class: …", "What makes it debt with a deadline: …", the
   "A correction worth keeping" style of narrative.
2. **Correction and rewording histories:** "Corrected 2026-…",
   "Amended 2026-…", "Clarified …", "Re-worded …", "Update 2026-…" **when
   the sentence explains why a wording changed.** When such a sentence
   states the current rule itself (for example "one further prefix is
   permitted by name: `/api/assistant/v1/`"), the rule sentence stays and
   only the explanation moves.
3. **Closed histories:** "All named instances are now closed …", "No live
   instance remains: `HubNav.tsx` …", the test-split clause's
   "(Clause added 2026-09-03: the previous text read as …)" block, the
   adoption-clause "(none, emptied 2026-09-02 …)" story (the list header
   "Live instances of the adoption clause" and its "(none)" stay).
4. **"Moved in mission-N" asides** inside a rule, where the rule already
   states the current home ("split out of `habitWrites.ts` in mission-35",
   "the three chore-flame copies moved over in F1", "moved from
   `feedbackTime.ts`'s private `CLOCK` in mission-48").
5. **Why-paragraphs** that give the reason behind a rule and bind
   nothing ("the proxy drills proved the sloppy prefix opens real holes";
   mission-16's 73px header story; the five-definitions month-names
   story; the `withTimeZone` four-copies story; "This is not pedantry: a
   test file that transitively imports `db.ts` …").
6. The danger register's "(Recorded 2026-09-03, mission-10: …)" story,
   the secrets rule's "(Corrected 2026-09-05: this rule used to open with
   `FAMILY_PASSWORD` …)" block, and the Settled decisions' two
   "(Corrected …)" and "written into this document 2026-09-05 …" notes.
   The rules themselves stay word for word.

**Stays in STRUCTURE.md:**
- Every sentence with must, never, only, "the one", "the only home",
  BLOCKER, NOTE, grandfathered, "a third copy is", "at the next touch",
  "Pending (…)".
- Instance **lists** that name files (`voice/parse.ts`, `mealSuggest.ts`
  …), grandfathered-debt lists, dependency-direction lists, decision
  numbers ("decision 138") and amendment ids ("Captain's A-L4-1").
- The short provenance tag at the end of a rule: "(Added 2026-09-04,
  mission-15, on Captain's ruling; Bryce approved.)" is one line and is
  itself the best pointer, so it stays, untouched, and the archive
  pointer goes after it.
- Size watch and trend paragraphs (D3).
- Anything Stark is unsure about. **When unsure, keep it, and list it
  under "Unsure" in the report** with the line and a sentence on why.
  Captain rules on each.

**Two sanctioned rewrites, and no others:**
- The header paragraph (lines 3 to 5 today) gains one sentence: "The
  story behind each rule (why it exists, which mission added it, its
  corrections) is in docs/history/structure-rationale.md under the same
  section and rule names; a rule here keeps a one-line pointer."
- The housekeeping note (D2), replacing "This file's growth is a trend
  to watch, never a BLOCKER: past 650 lines it is due a housekeeping pass
  that moves provenance narratives ("Added …", "Instance: …") into
  `docs/history/structure-rationale.md`, leaving each rule's binding text
  and a one-line pointer." with: "This file's growth is a trend to watch,
  never a BLOCKER. Its provenance stories (instances, corrections, why a
  rule exists) live in `docs/history/structure-rationale.md` under the
  same section and rule names; a rule here keeps its binding text and a
  one-line pointer, and a new rule's story goes straight to that file.
  The pass is due again 200 lines above the count recorded here: 1,676
  before the 2026-11-08 pass (mission-54), N after." (N filled in by
  Stark from `wc -l`.) The existing "(Added 2026-11-04, mission-27, on
  Captain's ruling; Bryce approved.)" tag stays and gains "Reworded
  2026-11-08, mission-54, Bryce approved." inside the same parentheses.
  The old sentence moves to the archive like any other story, so it is
  not lost.

## Fury's pre-dispatch checklist

- [x] Grep what the files hold before forbidding: every cross-reference
      form into STRUCTURE.md was listed (section names in 60 source
      comments and 75 mission or plan files; no `#anchor` links, no line
      numbers). None names a story; all name rules or sections that stay.
- [x] One contract touches STRUCTURE.md and the archive; the CLAUDE.md
      edit is a second, sequential contract. No parallel contracts.
- [ ] `node ~/.claude/skills/avengers/preflight.mjs <this file> C1` read
      line by line before dispatch.
- [ ] HEAD quoted last, after the records commit.
- [ ] `git show --stat HEAD` after every commit.
- [ ] `recordcheck.mjs` over the range before the final report.

## Contracts

### C1 - Move the provenance stories out of STRUCTURE.md into `docs/history/structure-rationale.md`, word for word, leaving a pointer behind each
- **Status:** PENDING (dispatch after Bryce's D1 to D3 and the switch to Opus 5.5)
- **Boundaries:** may touch: `STRUCTURE.md`, new `docs/history/structure-rationale.md` · must not touch: anything else (no `CLAUDE.md`, `DESIGN.md`, `AGENTS.md`, `README.md`, `docs/history/README.md`, mission or plan files, `src/`, `prisma/`, `package.json`; there is no env file in this worktree and none is to be created). No commits.
- **Preflight note (Fury, 2026-11-08):** preflight hard-fails STRUCTURE.md as "over the 650 hard cap". STRUCTURE.md's own File-size caps section says the caps govern source files, not documents, so this is the tool applying a code rule to prose; settled by that rule, not waived.
- **Spec:** the move rules above, the pointer form, the archive layout and the two sanctioned rewrites. Work section by section in file order. Keep STRUCTURE.md's headings and the Wide pages numbering untouched. Re-wrap moved text at about 78 columns; never change a word, a number, a path, a backtick or a quote mark. Do not fix typos, dashes or stale facts on either side (they are history now; list anything that looks wrong under "Noticed" in the report).
- **Verification (Stark runs, pastes output):**
  1. `git show 7dc5b28:STRUCTURE.md > /tmp/structure-old.md && node <checker> /tmp/structure-old.md STRUCTURE.md docs/history/structure-rationale.md --allow-diff` → zero `FAIL` lines; the `DIFF` block contains only the words of the two sanctioned rewrites.
  2. `wc -l /tmp/structure-old.md STRUCTURE.md docs/history/structure-rationale.md`.
  3. `grep -c 'structure-rationale.md, "' STRUCTURE.md` (pointer count) and, for every pointer, the named heading exists in the archive: `grep -o 'structure-rationale.md, "[^"]*"' STRUCTURE.md | sort -u` against `grep '^###\? ' docs/history/structure-rationale.md`.
  4. Amendment ids: `grep -oE '\bA-[A-Z0-9]+(-[0-9]+)?\b|\bA[0-9]{1,2}\b' /tmp/structure-old.md | sort -u` equals the same over the new STRUCTURE.md (every id still present).
  5. Section names: `grep -n '^## ' STRUCTURE.md` unchanged from the old file; `grep -c 'Wide pages' STRUCTURE.md` is at least 1; the strings "guard form", "adoption clause", "concern", "chrome", "per-member difference", "Layout map", "One source of truth", "trip condition" each still match.
  6. `npx tsc --noEmit && npx eslint . && npm test` (docs only, but the Gauntlet is the Gauntlet). Fury runs the UTC test and `npm run build` once before the PR.
- **Evidence required:** the full checker output; the three `wc -l` numbers; the pointer-to-heading match (or the mismatches); the amendment-id and section-name comparisons; `git diff --stat`; the **Unsure** list (kept in STRUCTURE.md, one line each with why); the **Noticed** list.
- **Done criteria:** Fury re-runs items 1 to 5 himself before dispatching Vision; the counts match Stark's report.
- **Report:** DONE, re-run by Fury 2026-11-08 and matching: 1,676 to 1,599 lines (archive 204), 23 passages moved and 23 pointers, each pointer naming a real `###` heading; 986 words moved; the checker's only additions are the header sentence, the housekeeping note and "Reworded 2026-11-08, mission-54, Bryce" in its tag; 41 of 41 amendment ids kept; `##` headings unchanged. `npm test` 1443 pass, eslint clean. `tsc` reports 2 errors, both in the git-ignored `.next/` validator files (a stale route), none in `src/`; the build before the PR regenerates them. Stark kept every passage entangled with a binding word, or inside a parenthetical with a closing bracket on its last word, and listed them as **Unsure** for Captain (the "Instance:" tags among them), which is why the result is above the plan's 1,350 to 1,450 estimate.

### C2 - CLAUDE.md: replace the one "Open, not scheduled" line and the Current status date
- **Status:** PENDING (after C1 passes its gates, right before the PR)
- **Boundaries:** may touch: `CLAUDE.md` · must not touch: anything else.
- **Spec:** replace the two-line bullet beginning "STRUCTURE.md is 1534 lines, 2.4 times its own 650-line housekeeping trigger" with: "STRUCTURE.md's housekeeping pass ran 2026-11-08 (mission 54, PR #<n>): the stories moved to `docs/history/structure-rationale.md`; the file went from 1,676 to <N> lines with every rule kept. The pass is due again at <N+200> lines." Change the heading "## Current status (updated 2026-11-08, L4)" to "## Current status (updated 2026-11-08, mission 54)". Nothing else. Fury may do this edit himself (two lines) rather than dispatching Stark; if so, this contract records it.
- **Verification:** `git diff --stat CLAUDE.md` shows one file, about 4 lines changed; `wc -l CLAUDE.md` under 250 is not required by this file's rule (its own cap note says ~250 and it is already over; not this mission's job, noted below).
- **Report:** (pending)

### F1 - Fix round: restore what the gates found, apply Captain's rulings on the Unsure list
- **Status:** PENDING
- **Boundaries:** may touch: `STRUCTURE.md`, `docs/history/structure-rationale.md`, `docs/history/README.md` · must not touch: anything else (no `CLAUDE.md`, no mission or plan files, no `src/`). No commits.
- **Sanctioned punctuation repair (Captain's ruling, recorded here because the plan said "two sanctioned rewrites, and no others"):** where a provenance tag and its story share one parenthetical, the archive holds the story verbatim, including the original closing bracket, and the tag left in STRUCTURE.md gains one closing bracket after its own last word. No word changes. Each such tag is the only new item it may add to the checker's DIFF block.
- **Restore to STRUCTURE.md verbatim, removing the pointer and, where the whole chunk comes back, its `###` heading:**
  1. Shared test helpers: the whole "This exists because `withTimeZone` ..." sentence (Vision and Captain BLOCKER). Remove chunk and pointer.
  2. Month and weekday names: the two sentences "It already holds `MONTH_NAMES` ... how to spell a month." and "`calendarViewConfig.ts` ... restraining." (Vision and Captain BLOCKER). "Two mechanisms now coexist ..." stays in the archive; the pointer stays after the restored text.
  3. Never `git add -A`: the whole "(Recorded 2026-09-03, mission-10: ...)" parenthetical (Vision and Captain BLOCKER). Remove chunk and pointer.
  4. Vocabulary gate: the sentence "The clause was collected in full before that happened ... deferring the cleanup." (Fury, from Vision's NOTE: `src/components/CalendarViews.tsx:252` cites "the hazard STRUCTURE.md names for `pinned`", Bryce required cross-references to land and this PR changes no code.) Anything else in that chunk stays in the archive, split at sentence boundaries as needed.
  5. Server Actions are public POST endpoints: the clause "the proxy drills proved the sloppy prefix opens real holes." It was a mid-sentence cut, which the move rules forbid (both gates' NOTE). Remove chunk and pointer.
- **Move to the archive (Captain's MOVE rulings; old-file line numbers from `git show 7dc5b28:STRUCTURE.md`):** 1029-1032 and 1037-1040 (the "Code lines" Instance stories); 1087-1091 (`isTodayCell` history from "DESIGN.md predicted"); 1407-1416 (reachability-flip Instance); 1546-1551 from "First instance:" to the end (tag left behind: "(Added 2026-09-03, mission-11.)"); 1497-1500 (STRUCTURE.md keeps "- (none)", the archive starts at the words after "(none"); 1015-1019 ("Note what changed its class" through "both files in one contract" only, at sentence boundaries); 1350-1356 ("This is not hypothetical ... five-line function."; "Count what exists, not what points at it." stays); 1441-1443 (the soft-cap `groceries.ts` parenthetical). One `###` heading and one pointer per contiguous passage.
- **Keep, no change:** every other Unsure item (Captain's KEEP rulings).
- **Also:** one line in `docs/history/README.md` listing the new file, in that file's own format. Re-measure with `wc -l` and put the real count in the housekeeping note's "after" number.
- **Verification (Stark runs, Fury and the gates re-run):** the C1 checks 1 to 5, against the same baseline `7dc5b28`. The checker's `<` lines must be only the old tag-ending words that gained a bracket; its `>` lines only those same words with a bracket, the header sentence, the housekeeping note and the "Reworded" tag.
- **Evidence required:** full checker output including every `<` and `>` line, `wc -l` for all three files, pointer-to-heading match, amendment ids compared, a grep showing `withTimeZone`, `FULL_MONTH_NAMES`, `pinned` and "right remedy" present in STRUCTURE.md.
- **Report:** DONE, re-run by Fury 2026-11-08 and matching: 1,583 lines, archive 241, 29 pointers matching 29 headings, 41 amendment ids kept, headings unchanged, 1,153 words moved. The checker's `<` lines are exactly the six tag endings that gained a bracket. Every MOVE ruling applied. Fury then moved one pointer by hand, out of the middle of the `formatHouseholdClock` sentence to the end of that rule.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision (`501be89`) | BLOCKED | 3: `withTimeZone` rule lost its subject; month-names rule counts into a list that left; the `git add -A` story held a live remedy | `npm test` 1443 pass, UTC run 1443 tests with 0 fail, eslint clean; `tsc` only the 2 stale `.next` errors. Pointer for `pinned` no longer lands (F1 restores it); `FAMILY_PASSWORD` to-do now only in the archive. |
| 1 | Captain (`501be89`) | BLOCKED | The same 3 | Ruled on the whole Unsure list (applied in F1); bracket repair acceptable if recorded; `docs/history/README.md` should list the new file. |

Budget: 3 passes per gate, then stop and surface.

## Handoff log

- 2026-11-08 (Fury, Fable): branch `claude/structure-md-cleanup-0b5cc7` is level with `main` `7dc5b28`. Measured STRUCTURE.md: 1,676 lines by `wc -l` (not 1,534; the Read tool shows 1,677 because it counts the last line without a newline differently). Read the whole file; found the stories come to roughly 250 to 300 lines, so the 650 target is not reachable by moving stories alone. Wrote `movecheck.mjs` in the scratchpad and self-tested it (a verbatim move passes; a reworded chunk fails; a pointer that swallows the old tag shows up as a diff, hence the separate-parenthetical pointer form). Plan written; waiting on Bryce's D1 to D3, then the switch to Opus 5.5, then C1.
- 2026-11-08 (Fury, Fable): Bryce approved the plan and took the recommendation on D1, D2 and D3. Records committed. Next: preflight C1, switch the chat to Opus 5.5, dispatch Stark.
- 2026-11-08 (Fury, Opus 5.5): Stark finished C1; Fury re-ran its checks and they match. C1 committed. Vision and Captain dispatched together on that commit so their findings batch into one fix round; Captain also rules on Stark's Unsure list.

## Delivery

- **Shipped:** (pending)
- **Shipped check:** `git log origin/main..HEAD` → (pending)
- **Deliberate leftovers:** CLAUDE.md is over its own ~250-line note (not this mission); the pending Captain amendments listed under Out of scope; the secrets rule's `FAMILY_PASSWORD` cleanup note (moving to the archive with its story; it says deleting the value from `.env` and Vercel is outstanding, which only Bryce can do).
