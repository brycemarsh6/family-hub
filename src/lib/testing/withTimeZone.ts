// Shared test helper: pins `process.env.TZ` for the duration of a callback,
// then restores it — so a single test can simulate a browser running in a
// specific timezone regardless of the ambient zone the whole suite was
// invoked under. Node re-reads `process.env.TZ` for every local Date
// getter/constructor, so this alone is enough to make a DST case genuinely
// non-vacuous under a zone that has no such transition (UTC, for example) —
// see any of this helper's callers for a real DST test built on top of it.
//
// Lives in `src/lib/testing/`, per STRUCTURE.md's exemption of that
// directory from the dormant-export rule: its tests ARE its callers, so an
// export with no *application* caller here is correct rather than dead.
// `withTimeZone` is the reason that exemption exists — it reached FIVE
// byte-identical copies (scheduleWindow.test.ts, timelineLayout.test.ts,
// calendarDates.test.ts, scheduleWindowStateRefresh.test.ts, and
// timelineDrag.test.ts), which the constitution's own count-definitions
// rule already treats as a failure, while the constitution offered nowhere
// to put a shared *test* helper (as opposed to shared application code).
// Migrated here in mission-20/F4, all five call sites at once — closing the
// debt outright rather than moving it, per the clause's own stated intent.
//
// Safe only for code under test that reads the local Date APIs
// (getters/constructors) rather than `Intl.DateTimeFormat`, which freezes
// its own resolved zone at construction time and would not observe a TZ
// change made after the fact — every module this helper is used against in
// this repo says so in its own header comment.
export function withTimeZone<T>(tz: string, run: () => T): T {
  const previous = process.env.TZ;
  process.env.TZ = tz;
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}
