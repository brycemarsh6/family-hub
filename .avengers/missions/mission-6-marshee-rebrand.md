# Mission: Marshee rebrand — palette, typography, rename

**Project:** family-hub (Marsh HQ → Marshee)
**Status:** DELIVERED (merged and pushed to origin/main)
**Started:** 2026-08-31 · **Updated:** 2026-08-31

## Brief

- **Goal:** Rebrand the app to the Marshee Brand Blueprint (reference:
  `~/Desktop/Marshee Brand.png`, 1448×1086 — a spec sheet, not assets):
  brand palette mapped onto the existing job-named tokens with
  WCAG-AA-compliant derived shades, Manrope/Inter/Cormorant Garamond
  typography, and the queued Marsh HQ → Marshee rename. Logo/app-icon
  regeneration is a **follow-up mission** gated on a vector mark (Bryce is
  tracing the M-heart on iPad → SVG; fallback: Claude draws it).
- **Done means:** the running app renders in the Marshee palette (light and
  dark), headings render Manrope and body Inter, every user-facing
  "Marsh HQ" says "Marshee", the login page carries the brand tagline in
  Cormorant Garamond italic, DESIGN.md reflects the new brand, and the
  gauntlet passes. Verified in the browser at 375px, light + dark.
- **Out of scope:** the logo mark / icon set (icon.png, apple-icon.png,
  favicon.ico stay house-and-heart until the SVG mission), package.json
  name / repo / Vercel project names (technical identifiers, per the
  Marsh Hub → Marsh HQ precedent), the nutrition donut's fixed data
  palette (explicitly not job tokens per DESIGN.md), Dusty Blue #8EAFC0
  (no UI job needs it yet — recorded in DESIGN.md as reserved).

## Danger register

- **The dev database IS the live family database.** Never `npm run db:seed`
  / `npm run db:reset`. This mission needs zero DB writes — no test-data
  scripts at all.
- **Never write a clean/reset script for the `User` table** (standing).
- **`.env` / secrets untouched.** No env changes needed.
- **No push while unattended.** Attended session: push at delivery per the
  project's standing after-mission rule, with the shipped check.

## Gauntlet

- `npx tsc --noEmit` → clean
- `npx eslint .` → clean
- `npm test` → all pass (52)
- `npm run build` → clean
- `node <scratchpad>/contrast.mjs` → every listed pair ≥ 4.5 (Vision re-runs)

## Assembled

- Stark + Vision (always)
- **Strange** — the whole mission is what a human sees; gates against the
  updated DESIGN.md at 375px, light + dark.
- Captain OUT: no new modules, no refactor, diff is token values + strings
  across ~10 existing files. Vision carries the cheap structure subset.
- Banner OUT: recon done inline by Fury (grep results recorded below).

## The approved token mapping (Fury's design decision, contrast-verified)

Brand: Sage #A8B498 · Dusty Blue #8EAFC0 · Peach #F3B99E · Cream #F6F0E8 ·
Butter #F4D26B · Warm Gray #8C847A · Charcoal #4E5256.
Raw sage fails contrast as an interactive color (2.18:1 on white) — the
functional palette derives darker/lighter shades per token job; ratios
from `scratchpad/contrast.mjs` (all AA ≥4.5 for text-bearing pairs).

LIGHT:
| token | value | derivation | key ratio |
|---|---|---|---|
| --bg | #F6F0E8 | Cream, brand-exact | — |
| --surface | #FFFFFF | cards on cream | — |
| --surface-2 | #EDE6D9 | cream deepened | fill only |
| --fg | #4E5256 | Charcoal, brand-exact | 7.88 on white, 6.96 on cream |
| --muted | #6F6A60 | Warm Gray darkened (raw = 3.69, fails) | 5.38 / 4.75 |
| --line | #E2D9C9 | cream/warm-gray border | decorative |
| --accent | #5A6B4F | Sage deepened for interaction | 5.75 on white, 5.08 on cream |
| --accent-fg | #F6F0E8 | Cream on deep sage (on-brand) | 5.08 |
| --accent-soft | #E4E9DC | Sage lightened | accent-on-it 4.65 |
| --warn | #8A6410 | Butter deepened | 5.37 / 4.53 on soft |
| --warn-soft | #FAEBC3 | Butter lightened | — |
| --danger | #A63A2A | Peach-family brick (red stays red) | 6.44 / 5.14 on soft |
| --danger-soft | #F9E1D6 | Peach lightened | — |

DARK:
--bg #1C1B16 · --surface #262420 · --surface-2 #302D27 · --fg #F6F0E8
(Cream) · --muted #A9A296 (6.12) · --line #3B372F · --accent #B7C3A6
(light sage, 8.39 on surface) · --accent-fg #232B1C (7.93) ·
--accent-soft #2C3324 · --warn #F4D26B (Butter brand-exact, 10.53) ·
--warn-soft #3D3212 · --danger #E89078 (6.41, 5.84 on soft) ·
--danger-soft #472018.

themeColor/manifest: light #F6F0E8, dark #1C1B16 (3 places: both layouts'
viewport + manifest.ts background_color/theme_color).

Typography: Inter → --font-sans (body); Manrope → new --font-display
(h1–h3 global rule + `font-display` utility via @theme); Cormorant
Garamond italic → new --font-accent, used ONLY for the login tagline
("A family hub app designed to bring what matters together." — the brand
sheet's own line). Geist + Geist_Mono removed from both layouts;
`--font-mono` @theme override deleted (grep: zero `font-mono` usage in
markup — Tailwind's default stack suffices).

Rename map (grep "Marsh HQ", complete): (app)/layout.tsx (metadata.title,
header wordmark), manifest.ts (name, short_name), (app)/login/page.tsx
(h1), share/recipe/[token]/page.tsx + share/cookbook/[token]/page.tsx
("Shared from Marsh HQ."), src/lib/voice/alexa.test.ts (helper-test
literal ×2 — not user-facing, included so `grep "Marsh HQ" src/` ends
empty), prisma/bootstrap-users.ts (console banner). NOT touched:
package.json name, folder/repo/Vercel names, CLAUDE.md/README history
(Fury updates doc headers at delivery).

## Contracts

### CB1 — Apply the Marshee palette, typography, and rename in one code pass
- **Status:** PENDING
- **Boundaries:** may touch: `src/app/globals.css`,
  `src/app/(app)/layout.tsx`, `src/app/share/layout.tsx`,
  `src/app/manifest.ts`, `src/app/(app)/login/page.tsx`,
  `src/app/share/recipe/[token]/page.tsx`,
  `src/app/share/cookbook/[token]/page.tsx`,
  `src/lib/voice/alexa.test.ts`, `prisma/bootstrap-users.ts` ·
  must not touch: anything else — especially `prisma/schema.prisma`, any
  `db:*` script, `.env*`, `src/app/icon.png`, `src/app/apple-icon.png`,
  `src/app/favicon.ico`, DESIGN.md/STRUCTURE.md (Fury's), the nutrition
  donut's fixed palette, `package.json`.
- **Verification:** the four gauntlet commands, each exiting 0.
- **Evidence required:** full gauntlet output; `grep -rn "Marsh HQ" src/
  prisma/` → empty; `grep -rn "Geist" src/` → empty; the final globals.css
  token block quoted in the report.
- **Done criteria:** gauntlet clean + both greps empty + token values
  byte-match the approved mapping table above.
- **Report:** —

### CB2 — (Fury, done) Brand assets prepared from Bryce's real vectors
- **Status:** DONE (Fury — deterministic asset work, visually verified)
- Bryce delivered three genuine outlined-vector SVGs in
  `~/Desktop/Marshee Brand/`. Verified: real `<path>` data (no embedded
  raster), zero `<text>` (no font dependency), ink centered within 1px on
  all three. Legible to 32px; 16px soft but acceptable.
- **Rejected source:** `~/Desktop/marshee_brand_assets/marshee-mark.svg` is
  a 324-byte 6-point approximation — a horseshoe missing the M's centre
  descender. Its README claims "immutable source of truth"; it is not the
  real mark. Its `marshee-design-tokens.json` IS accurate and independently
  confirms CB1's palette + type choices.
- **Normalised into `brand/`** (new dir, mirrors the `alexa/` precedent:
  committed source, never imported by app code — STRUCTURE.md amendment
  needed, see CB4): `marshee-mark.svg`, `marshee-wordmark.svg` (both
  `currentColor`), `marshee-app-icon.svg` (sage tile + cream mark, opaque).
  Fixed the source's colour drift — three different creams (`#F6F0E8` ok,
  `#F8EEDC`, `#FBF1E3`) normalised to brand Cream; dropped a redundant
  white rect under the sage tile.
- **Icons regenerated** from the master SVG via headless Chrome at exact
  sizes: `src/app/icon.png` 1024² (472KB → 31KB), `src/app/apple-icon.png`
  180² (the size iOS actually requests; 363KB → 4.6KB),
  `src/app/favicon.ico` hand-built multi-resolution 16/32/48, directory
  verified by re-parsing the ICO header. Tiles stay **square** — iOS and
  Android apply their own mask; a pre-rounded source double-rounds.
- **Components generated** (path data copied from the masters, not
  retyped): `src/components/MarsheeWordmark.tsx` (`currentColor`, so light
  mode renders Charcoal and dark renders Cream — the brand sheet's own two
  monochrome variants, one asset), `src/components/MarsheeIcon.tsx` (fixed
  sage/cream, `rx` baked in for in-app use only).

### CB3 — Wire the brand lockup into the header and login page
- **Status:** DONE. Header renders `MarsheeIcon` (h-10 w-10) +
  `MarsheeWordmark` (h-[26px]); login renders the same lockup at h-16/h-9
  above the CB1 tagline. `next/image` + the `icon.png` import are gone.
- **Blocked once, correctly**, on the CB2 favicon RGBA bug (Stark refused to
  fix a must-not-touch file and proved via `git stash` that his own edits
  weren't the cause — the right call). Fury fixed it; Stark then completed
  verification.
- **Report/evidence:** gauntlet clean, 90/90 tests. Header link measured
  **48px** (`getBoundingClientRect`) — the `min-h-12` rule holds. The
  critical `currentColor` check **passed with measured values**:
  `getComputedStyle` on the wordmark resolves `rgb(78, 82, 86)` in light
  (= Charcoal #4E5256) and `rgb(246, 240, 232)` in dark (= Cream #F6F0E8),
  confirmed independently on both the header and login instances — one
  asset genuinely producing both brand monochrome variants. Screenshots
  captured at 375px light + dark. Login sizing judged correct on sight, no
  change made.

### CB5 — (Fury) Retune AVATAR_COLORS for the brand
- **Status:** DONE (Fury — an 8-value constant edit; not ceremonialized
  into a Stark dispatch, per the doctrine's own "don't ceremonialize
  trivial edits" rule. Vision audits it in the diff.)
- Prompted by an audit answering Bryce's "do we need a plan to apply this
  everywhere": **no** — 821 token-based utilities across 109 `.tsx` files
  already followed the rebrand automatically, and there are **zero**
  Tailwind default palette colors anywhere in `src/`. The colors-named-by-
  job rule did its job. The only genuine gap was `AVATAR_COLORS`.
- Retuned all 8 to warmer, desaturated values in their own name's family
  (`#2563eb` → `#41708c`, etc). Safe by construction: the DB stores the
  swatch **name**, never the hex — the constant's own comment anticipated
  exactly this retune, so no migration and no stranded rows.
- **Found a real pre-existing accessibility bug while measuring:** three of
  the OLD swatches failed WCAG AA for the white text rendered on them —
  green 3.30:1, amber 3.19:1, teal 3.74:1 — despite `AvatarBadge`'s comment
  claiming white legibility was "verified visually against all 8 colors."
  Eyeballing missed it; measuring caught it. All 8 new swatches are ≥4.6:1,
  with minimum pairwise separation ΔE 23 so they stay tellable apart (the
  whole point of an avatar color). Both constraints recorded in the
  constant's comment so a future retune re-checks them.
- **Boundaries:** may touch: `src/app/(app)/layout.tsx`,
  `src/app/(app)/login/page.tsx` · must not touch: everything else,
  especially `brand/`, the two new `Marshee*.tsx` components, the icon
  binaries, `globals.css`, `manifest.ts`, and all share/ routes.
- **Verification:** full gauntlet; header renders lockup at 375px in light
  and dark; the header link keeps its ≥48px tap target.
- **Evidence required:** gauntlet output; the header JSX quoted; screenshots
  at 375px light + dark.
- **Done criteria:** gauntlet clean, `next/image` + `appIcon` import gone,
  tap target intact, wordmark visibly inherits `--fg` in both schemes.

### CB4 — (Fury) DESIGN.md brand section + STRUCTURE.md `brand/` amendment
- **Status:** DONE (Fury). Both constitutions retitled Marsh HQ → Marshee.
- **DESIGN.md** gained a **Brand** section (masters in `brand/` are never
  redrawn; the wordmark is artwork not text and uses `currentColor` to get
  both monochrome variants from one asset; app-icon PNGs stay square
  because the OS masks them). **Color semantics** gained the rule that
  matters most for future sessions: *the brand palette is the source, not
  the token values* — raw Sage is 2.18:1 and raw Warm Gray 3.69:1, both
  failing AA, so `--accent`/`--muted` are deepened derivations and must not
  be "corrected" back to the brand hexes. Dusty Blue recorded as reserved
  with no job. Typography's three faces each given one job, with the
  one-place-only rule for Cormorant Garamond. The icon-system exception
  that used to name "the header's house-and-heart PNG" now names the
  Marshee mark and wordmark.
- **STRUCTURE.md** gained a `brand/` row in the layout map (mirrors
  `alexa/`: committed source, never imported by app code) and a
  one-source-of-truth entry making a re-traced second copy of the mark or
  wordmark a BLOCKER, naming the superseded desktop folder explicitly so
  nobody adopts it later.
- **Boundaries (corrected — Vision caught CB3's text copy-pasted here):**
  touched exactly `src/lib/constants.ts`. No other file was in scope and
  none was changed; `AvatarBadge.tsx` renders the swatches but needed no
  edit, since the DB stores the swatch *name* and the component reads the
  hex through `avatarColorHex()`.
- **Verification:** full gauntlet + computed WCAG ratios vs white and
  pairwise CIE76 ΔE for all 8 swatches, old set and new.

### CB7 — (Fury) Header shows the sage wordmark alone
- **Status:** DONE. Bryce's request after seeing CB3 live, plus a new
  `Sage Wordmark.svg` he supplied.
- **The supplied file was deliberately NOT added as an asset.** Overlaid
  against `brand/marshee-wordmark.svg`: the artwork is identical — same
  drawing, filled Sage and re-exported at higher coordinate precision
  (5893 vs 3035 chars on path 0, no visual divergence). Adding it would be
  a second copy of the wordmark, which STRUCTURE.md's one-source-of-truth
  list now makes a BLOCKER, and two copies drift. Only the *colour*
  differed, and DESIGN.md's Brand section already permits recolouring via
  `fill`.
- Added **`--brand-sage: #a8b498`** to `globals.css` — a *brand artwork*
  token, explicitly not a job token, in the same category as the colours
  `MarsheeIcon` pins. Same value in both themes, because a logo that
  changes colour between themes isn't the same logo. `--accent` (#5a6b4f)
  stays what it is: the deepened derivation for interactive elements. The
  two are not interchangeable and the comment says so.
- Header now renders `<MarsheeWordmark className="h-8 w-auto
  text-brand-sage" />` alone — no icon tile — at **32px**, up from 26px per
  Bryce's "a little larger". `MarsheeIcon`'s import dropped from the layout.
- **Contrast recorded honestly in the token's own comment:** raw Sage is
  **2.18:1** on the light header, which would fail AA *for text* — but WCAG
  exempts logotypes, and the monoline strokes carry it at 32px. Dark header
  is 7.12:1. The comment names `text-accent` as the fix if it ever needs
  more weight, so nobody edits the brand value itself.
- **Login deliberately unchanged** (Bryce's call): it keeps the icon tile
  above the wordmark as a hero. The header is where showing both crowded a
  48px bar; the login page is sparse and is where the app introduces itself.
- Verified in the running app at 375px, both schemes, on real pages.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | **PASS** | 0 | 5 (see below) |
| 1 | Strange | BLOCKED-ON-ENV | — | 2 |
| 2 | Strange | **PASS** | 0 | 2 |

**Strange pass 1 — BLOCKED-ON-ENVIRONMENT, correctly.** Could not obtain a
session: the Browser pane profile is signed out, minting a dev JWT (reading
`SESSION_SECRET`) was denied by the permission classifier, and guessing a
password is both forbidden by dispatch and would write real `LoginAttempt`
rows to the **live family database**. He refused to design-pass the
authenticated app from source — the right call, not a failure.
*Reviewed (real pixels):* `/login` at 375px light + dark and 1280px light,
plus the header lockup instance both schemes/widths. **No BLOCKERs there**,
all measured: wordmark computes `rgb(78,82,86)` light / `rgb(246,240,232)`
dark on both instances (independently confirming CB3 a third time); body
computes Inter, headings the display face, tagline Cormorant Garamond
italic and the only serif on the page; person chips 56px, header lockup
48px; blue/red avatar swatches read cleanly with white initials and are
unmistakably distinct.
*NOTEs:* (1) hero lockup centered but tagline left-aligned — **fixed**,
`text-center` added; (2) at desktop the header lockup and hero lockup are
both visible ~80px apart, a doubled mark — violates nothing written,
observation only.
*Unreviewed and still the mission's real risk surface:* the `--danger`
(brick) vs `--warn` (ochre) distinction at density on
`/kitchen/inventory` + `/kitchen/expiring` — the mission's own sharpest
design question — plus `--muted` in dense lists, Manrope hierarchy on
content-heavy pages, shopping chips, recipe detail (stars/hero/nutrition
donut), the other six avatar swatches, and the login error state.
**Bryce signed in himself** (Fury cannot enter a password, and guessing one
would write to the live DB) — Strange resumed and completed pass 2.

**Strange pass 2 — PASS.** Reviewed at 375px light + dark, desktop where
layout differs: Inventory at real 467-item density with Produce expanded,
Expiring across the Eat-now/This-week boundary, Shopping, a real recipe
detail (stars, hero, nutrition), Cookbooks, `/settings/family`, and the
avatar picker's all-8 swatches. **The mission's sharpest question resolved
in favour of the palette:** on Expiring, brick-on-peach vs ochre-on-butter
differ at the *background* level in both schemes, so urgent and caution
still read as two different claims. Confirmed clean: every rendered value
resolves to the approved tokens; `~` estimate marks intact; the nutrition
donut's fixed palette correctly untouched; `--muted` comfortable at real
density (not just passing its 4.75:1); all h1–h3 compute Manrope and still
read as headings; the five real family members happen to cover **green and
amber** — the two lowest-contrast swatches — and white initials read
cleanly on both; tap targets hold (lockup 48, account 44, chips 56,
stars 44).
*Two unreviewable states, correctly NOT produced rather than faked:*
Shopping's checked-row styling and the login error state both require
writing to the live database; Expiring's "Coming up" chip has no real item
in that window and was verified in source only.

### CB6 — (Fury) Out/Low badge distinction on Inventory
- **Status:** DONE. Strange's NOTE 1, acted on rather than deferred.
- `PantryRow.tsx:44` rendered **Out** as `text-danger` on **`bg-warn-soft`**
  — the same butter chip **Low** uses — so only the text hue separated them,
  and those two hues measure **1.20:1** against each other: invisible to a
  color-blind reader, faint to everyone else. The markup predates this
  mission and broke no written rule, but the brand palette's warmer,
  closer-together `--danger`/`--warn` narrowed a distinction the old
  red/amber pair gave away for free — so the rebrand is what made it
  matter.
- Changed to `bg-danger-soft text-danger`, which is exactly the treatment
  `ExpiringRow` already uses for "overdue". One class. The file's own
  comment already said *"Out and Low are different problems"* — the code now
  matches its comment.
- Verified in the running app at 375px, both schemes: computed background
  `rgb(249,225,214)` (peach) vs Low's butter, visually unmistakable on the
  real inventory (three Out rows beside a Low row). Legibility kept:
  5.14:1 light / 5.84:1 dark for Out, 4.53:1 / 8.58:1 for Low.

**Vision pass 1 — PASS.** Re-ran the gauntlet himself (tsc/eslint/build all
0, 90/90 tests) and re-derived every load-bearing claim rather than reading
them: header link exactly **48px** in both schemes; wordmark computed color
**rgb(78,82,86)** light / **rgb(246,240,232)** dark on *both* the header and
login instances; favicon re-parsed byte-level as 3 frames, all colortype 6
(RGBA); all 8 avatar swatches ≥4.67:1 vs white with min ΔE **23.28**, and
the old set's three failures (3.30 / 3.19 / 3.74) confirmed correct to the
hundredth. Boundary audit matched the declared set exactly. Confirmed zero
Tailwind default-palette utilities and zero `font-mono` usage (so the
`@theme` removal is safe), and that `font-accent` appears in exactly one
place — DESIGN.md's claim verified against the code, plus the computed font
checked in-browser.

Vision's NOTEs, and their disposition:
1. *CB5's contract block was CB3's text copy-pasted* — a defect in this
   mission file, not scope creep. **Fixed above.**
2. *`--muted` on `--surface-2` is 4.33:1 in light, under AA*, and real text
   uses that pair (`ExpiringRow.tsx:12`, `FamilyList.tsx:83`). **Not a
   regression — the old palette was 4.19:1 on the same pair, so the rebrand
   improved it.** Genuine pre-existing shortfall; queued as a follow-up, not
   a blocker for a change that made it better.
3. *Three dark-mode comments in `globals.css` say "on --bg" but quote the
   on-`--surface` ratios* (true on-bg values are higher). Comment-labeling
   error, conservative direction. **Fix queued.**
4. *`AvatarBadge.tsx`'s comment still claims white legibility was "verified
   visually against all 8 colors"* — the exact claim CB5 proved false for
   the old set. It was outside every contract's boundaries so leaving it was
   correct. **Fix queued** — an actively misleading comment.
5. *`icon.png`/`apple-icon.png` are RGB, not RGBA* — correct and fine; the
   RGBA requirement was specific to Turbopack's ICO decoder.

## Notes (not this mission's job)

- **NOTE — the recurring `* 2.ts` "build-artifact race" is iCloud sync,
  not a race.** CLAUDE.md's C4 and C6 entries both record transient
  `.next/types/* 2.ts` duplicate-identifier errors and attribute them to a
  concurrent build/dev-server race. This mission produced the same artifact
  in *source*: `src/app/(app)/layout 2.tsx` and `login/page 2.tsx` appeared
  byte-identical to their originals, timestamped 21s earlier, right after
  Stark's `git stash push`/`pop`. The repo lives in `~/Documents`, which
  macOS syncs to iCloud Drive (confirmed present; `brctl` reports the
  container is in a `needs-sync` / `blocked-app-uninstalled` state) — and
  " 2" suffixed copies are exactly iCloud's conflict-copy naming. Both
  strays were removed (untracked, byte-identical, nothing referenced them).
  Worth telling Bryce: a git repo inside iCloud-synced Documents can
  produce conflict copies mid-build, and the fix is either excluding the
  folder from sync or moving the repo outside `~/Documents`. Out of scope
  here; recorded so the next session stops calling it a race.

## Handoff log

- 2026-08-31 — Mission created. Recon done inline (rename map, font
  usage, hardcoded hex sweep — only themeColor×2 + manifest carry raw
  page-bg hexes outside globals.css). Contrast table computed and
  recorded. CB1 ready to dispatch.

## Delivery

- **Shipped:** CB1 palette + typography + rename · CB2 brand assets from
  Bryce's own vectors (masters in `brand/`, icon set regenerated) · CB3
  header + login lockup · CB4 both constitutions · CB5 avatar palette
  retune · CB6 Out/Low badge fix · CB7 sage wordmark alone in the header. Docs: README + CLAUDE.md title and the
  two stale "rename queued" claims; CLAUDE.md history deliberately left
  intact rather than rewritten.
- **Gauntlet at delivery:** `tsc` 0, `eslint` 0, **90/90 tests**,
  `build` 0.
- **Gates:** Vision PASS (0 blockers, 5 notes) · Strange PASS (0 blockers,
  2 notes, one of which became CB6).
- **Shipped check:** ✅ **`b9fa618` is on `origin/main`.** Committed on a
  `marshee-rebrand` branch, gauntlet re-run on the committed tree,
  fast-forward merged to main, gauntlet run once more on main, then pushed.
  `git rev-list --count origin/main..HEAD` = **0**; branch deleted after
  merge. Verified the commit carries real content per file rather than
  trusting the stat line (the M1 content-free-rename lesson).
- **Deliberate leftovers:** Dusty Blue #8EAFC0 is in the brand but has no
  UI job yet — deliberately unassigned rather than forced onto a token
  (DESIGN.md records it as reserved). The old house-and-heart art is fully
  retired from the app; `~/Desktop/marshee_brand_assets/` is superseded
  and should not be used as a source (its mark is an approximation — see
  CB2). Bryce's iPad tracing is no longer needed: he supplied finished
  vectors instead.
