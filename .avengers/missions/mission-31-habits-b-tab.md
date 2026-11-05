# Mission: Habits & Chores PR B, the tab (mission 31)

**Project:** family-hub (Marshee)
**Status:** INTERROGATING (waiting on Bryce's approval of the PR B mock)
**Started:** 2026-11-05 · **Updated:** 2026-11-05

## Brief

- **Goal:** the "PR B, mission 31: the tab" section of
  `.avengers/plans/habits-chores-build.md`: the Today list, filter chips,
  Skip, the manager with drag-and-drop, the new-item form, archive and
  delete. Decisions 84 to 86 in `.avengers/plans/habits-chores-v1.md` are
  part of it.
- **Done means:** not written yet. It is set when Bryce approves the mock.
- **Out of scope:** everything the build plan puts in PRs C to F.

## Prerequisites from the build plan

- **C0, the drag-and-drop spike: PASSED.** Branch `claude/habits-b-spike`
  (commit 23bc5d9, never merged) added `@dnd-kit/core` 6.3.1,
  `@dnd-kit/sortable` 10.0.0 and `@dnd-kit/utilities` 3.2.2, pinned exact,
  with a test page at `/habits/spike`. On 2026-11-05 Bryce tested it on his
  iPad from the Vercel preview: dragging by the grip worked, finger scrolling
  elsewhere on a row worked, and the order survived a reload ("everything
  worked, and it saved even when I reloaded the page"). So the hand-written
  pointer sortable fallback is not needed; PR B uses dnd-kit with
  PointerSensor and KeyboardSensor, as in the spike.
- **Icon allow-list: APPROVED** (Bryce, 2026-11-05: "the 14 icons are
  fine"). `HABIT_ICONS` in `src/lib/habitVocabulary.ts` keeps its 26 names
  and adds these 14, for 40: Salad, Coffee, GlassWater, Utensils,
  CigaretteOff, AlarmClock, Timer, Church, HandHeart, Sparkles, PiggyBank,
  Briefcase, GraduationCap, ShoppingCart. All 14 exist in the installed
  `lucide-react`.
- **The mock: NOT YET.** The canvas mock gets updated for decisions 68 to 83
  (audit Part 6) and 84 to 86, then Bryce approves it before any contract is
  written.

## Notes

- Signing in on a preview link lands on the dashboard, not the page you
  opened. Give Bryce the full address to type in again after he signs in.
- Bryce made two test goals on the dev branch while finding the spike page.
  They are harmless test data.
