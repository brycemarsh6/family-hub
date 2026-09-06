#!/usr/bin/env node
// Fury's recordcheck — gate a change to the RECORD, not the code.
//
// WHY THIS EXISTS. On 2026-09-06 a session audited CLAUDE.md for accuracy and
// was gated three times. Each pass found a false claim, and each false claim
// had been introduced by the correction of the one before it:
//
//   pass 1 — "eleven contracts, C1-C12 with no C5". Counted headings in a
//            mission file and concluded the missing number never existed.
//            `git log` showed C5 and C3b had shipped; thirteen were
//            dispatched. STRUCTURE.md cites mission-15/C5 in two places,
//            which the "correction" would have made look fictional.
//   pass 2 — the fix for an overclaim about DST coverage asserted it lived
//            "only in" two named test files. A third had two dedicated cases.
//   pass 3 — the fix that corrected a contract count to "four" added
//            "across three missions" in the same breath. They sit in two.
//            The same commit also inserted a checklist item at position 4,
//            making a sentence that said "item four" stale inside one commit.
//
// Not one of these was in code. Not one would have been caught by re-reading.
// All three were caught by running a command against the claim. That is the
// whole design: this tool turns an added sentence into the command that
// settles it, and refuses to let a record change go out unread.
//
// Bryce approved building it after the third instance.
//
// WHAT THIS TOOL IS NOT. It cannot decide whether a claim is true.
//
// It hard-fails on ONE thing: a commit hash that does not resolve. That is
// the only check measured to have zero false positives against real history
// (six merges). Everything else it SURFACES, deliberately. The first cut
// hard-failed on named-but-absent files and on positional references too,
// and would have blocked FOUR of those six merges on ordinary prose — a
// mission file legitimately names a file a contract proposes to create, and
// "Step 1 … `CalendarHeader.tsx`" is not a reference into that file. A gate
// that cries wolf gets tuned out, which is the failure this tool exists to
// address, so it informs where it cannot be certain.
//
// A clean run means the one decidable trap is clear, never that the record
// is accurate. Read the REVIEW lines; that is where every false claim this
// tool was built for actually sat.
//
// USAGE
//   node recordcheck.mjs                 # origin/main..HEAD
//   node recordcheck.mjs <base>..<head>  # any range
//   node recordcheck.mjs <commit>        # that commit against its parent
//
// Exit 0 = no hard failure. Exit 1 = at least one hard failure.

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  findClaims,
  findIdentifiers,
  findPathLikes,
  filesReferencing,
} from "./lib/claims.mjs";

const arg = process.argv[2] || "origin/main..HEAD";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

const git = (args) =>
  execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 64e6 });

// A bare commit means "that commit against its parent".
const range = arg.includes("..") ? arg : `${arg}^..${arg}`;

let hardFailures = 0;
let reviewCount = 0;
const say = (s = "") => console.log(s);
const FAIL = (s) => {
  hardFailures++;
  say(`  ✗ FAIL   ${s}`);
};
const REVIEW = (s) => {
  reviewCount++;
  say(`  ? REVIEW ${s}`);
};
const OK = (s) => say(`  ✓ ok     ${s}`);

say(`recordcheck — ${range}`);
say(`repo: ${repoRoot}`);

// Which record files changed, and what did they gain?
let changedFiles;
try {
  changedFiles = git(["diff", "--name-only", range])
    .split("\n")
    .filter(Boolean);
} catch (e) {
  console.error(`recordcheck: cannot diff ${range}\n${e.message}`);
  process.exit(2);
}

const recordFiles = changedFiles.filter((f) => f.endsWith(".md"));
if (recordFiles.length === 0) {
  say("\nNo .md record files changed in this range — nothing to gate.");
  process.exit(0);
}
say(`record files changed: ${recordFiles.join(", ")}`);

/** Added lines only — a record change is judged on what it now asserts. */
function addedLines(file) {
  const patch = git(["diff", "-U0", range, "--", file]);
  return patch
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
    .map((l) => l.slice(1));
}

for (const file of recordFiles) {
  const added = addedLines(file);
  if (added.length === 0) continue;
  const text = added.join("\n");
  say(`\n=== ${file} (+${added.length} lines) ===`);

  // CHECK 1 — a named file must exist, unless the sentence says it doesn't.
  //
  // Tuned down hard after its first run, which flagged a shell command, three
  // directories, a glob, two contract ids and a file the sentence explicitly
  // said was absent. A check that cries wolf gets tuned out — this project
  // already learned that building the irregularity queue, and a record gate
  // nobody reads is worse than none.
  const denial =
    /\b(does not exist|doesn't exist|never existed|absent|deleted|removed|not exist|no longer|would have been|which does not|never built|gone|correctly absent)\b/i;
  for (const p of findPathLikes(text)) {
    // Not a path: shell commands, globs, home-relative, bare directories,
    // and contract ids like `CV3/C5` or `mission-15/C9`.
    if (
      /\s/.test(p) ||
      p.includes("*") ||
      p.startsWith("~") ||
      p.endsWith("/") ||
      /(^|\/)C\d+[a-z]?$/.test(p) ||
      !/\.[a-z]+$/i.test(p)
    ) {
      continue;
    }
    const line = added.find((l) => l.includes("`" + p + "`")) || "";
    // "no `fetchWindow.ts`" is a denial too, and the prose form is common.
    if (denial.test(line) || new RegExp("\\bno\\s+`" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "`").test(line)) {
      continue;
    }
    const direct = resolve(repoRoot, p);
    let exists = existsSync(direct) && statSync(direct).isFile();
    if (!exists) {
      // Records name paths the way humans do — "skills/avengers/SKILL.md"
      // for ".claude/skills/avengers/SKILL.md". Resolve by suffix.
      try {
        exists =
          git(["ls-files", "--", `*${p}`, p]).split("\n").filter(Boolean)
            .length > 0;
      } catch {
        exists = false;
      }
    }
    if (!exists) {
      // REVIEW, not FAIL. Tested against six real merges: mission files
      // legitimately name files that a contract PROPOSES to create, or that
      // a split candidate WOULD produce, or that were deleted — four of the
      // six would have been blocked on that prose alone. A gate that cries
      // wolf gets tuned out, which is the failure this whole exercise is
      // about, so this one informs and does not block.
      REVIEW(
        `\`${p}\` is named and no such file is tracked. Fine if it is a ` +
          `proposal or something removed; wrong if the sentence means it is ` +
          `there today.`,
      );
    }
  }

  // CHECK 2 — a commit hash must resolve. The ONLY blocking check.
  //
  // With one carve-out, found by running this against real history: a record
  // may deliberately cite a WRONG hash to document a mistake, as mission-15
  // does with "(`a6e6a86`; actual `6e496a1`)" — the record of a stale HEAD in
  // a gate dispatch. That is the record doing its job, not a defect, so a
  // line that flags its own bad hash is exempt.
  const hashDenial =
    // Vocabulary widened after running this tool on its own session entry,
    // which described two hashes as deliberately bad and was blocked for it.
    /\b(actual|stale|wrong|incorrect|does not resolve|never existed|superseded|amended away|typo|deliberately|scratch|fictional|placeholder|no denial)\b/i;
  for (const m of text.matchAll(/`([0-9a-f]{7,40})`/g)) {
    const sha = m[1];
    try {
      git(["cat-file", "-e", `${sha}^{commit}`]);
    } catch {
      // A CONTEXT WINDOW, not the single line. Found by running this tool on
      // its own session entry: prose wraps, so "mission-15 cites `a6e6a86`
      // where the real hash is …" put the hash on one line and the word that
      // explains it on the next, and the check blocked a record that was
      // being careful. A per-line test of wrapped prose is the wrong unit.
      const i = added.findIndex((l) => l.includes("`" + sha + "`"));
      const ctx = i === -1 ? "" : added.slice(Math.max(0, i - 2), i + 3).join(" ");
      if (hashDenial.test(ctx)) {
        REVIEW(
          `\`${sha}\` does not resolve, but the line marks it as wrong on ` +
            `purpose. Confirm that is what it means.`,
        );
      } else {
        FAIL(
          `\`${sha}\` does not resolve to a commit in this repo. A record ` +
            `that cites a hash nobody can check is a record you cannot audit.`,
        );
      }
    }
  }

  // CHECK 3 — a positional reference into a file this same diff changed.
  // This is pass 3's blocker exactly: a sentence said "item four on the
  // checklist" and was right when written; the same commit inserted a new
  // item at position four and left the sentence behind.
  // Only an actual ordinal counts. An earlier version took the next word
  // whatever it was and reported the phrase "item pre".
  const positional = [
    ...text.matchAll(
      /\b(item|step|point|rule|line)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/gi,
    ),
  ];
  if (positional.length > 0) {
    const otherChanged = changedFiles.filter((f) => f !== file);
    for (const m of positional) {
      const phrase = m[0];
      const ctx = added.find((l) => l.includes(phrase)) || "";
      const referenced = otherChanged.filter((f) =>
        ctx.toLowerCase().includes(f.split("/").pop().toLowerCase().replace(/\.md$/, "")),
      );
      if (referenced.length > 0) {
        REVIEW(
          `"${phrase}" may point at a position inside ${referenced.join(", ")}, ` +
            `which THIS SAME DIFF changes. Re-count it. A correct positional ` +
            `reference went stale inside one commit on 2026-09-06. (REVIEW, ` +
            `not FAIL: on real history this also matches a step number that ` +
            `merely sits near a filename.)`,
        );
      } else {
        REVIEW(
          `"${phrase}" is a positional reference — it breaks silently the ` +
            `moment the thing it counts into gains a row, and nothing can ` +
            `detect that if the sentence never names its target. NAME THE ` +
            `ITEM instead ("the run-preflight step"), which cannot go stale.`,
        );
      }
    }
  }

  // CHECK 4 — surface every claim, with the counts that settle it nearby.
  const claims = findClaims(text);
  const idents = [...findIdentifiers(text)];
  if (claims.length === 0) {
    OK(`no quantitative or negative claims detected in the added lines`);
  } else {
    REVIEW(
      `${claims.length} claim(s) added. THIS TOOL CANNOT SETTLE THEM. For a ` +
        `count of contracts, files or occurrences, the command is \`git log\` ` +
        `or \`git grep\` — NOT a count of headings in the file you are editing. ` +
        `That mistake is why this tool exists:`,
    );
    for (const c of claims) {
      say(`           • ${c.length > 170 ? c.slice(0, 170) + "…" : c}`);
    }
  }
  if (idents.length > 0) {
    say(`           — identifiers named in the added lines, with real counts:`);
    for (const id of idents.slice(0, 12)) {
      const files = filesReferencing(id, repoRoot);
      say(`             \`${id}\` → ${files.length} file(s)`);
    }
    if (idents.length > 12) say(`             …and ${idents.length - 12} more`);
  }
}

// CHECK 5 — the reverse of check 3, and the one that would actually have
// caught 2026-09-06's third blocker.
//
// That staleness was NOT in an added line. A sentence in CLAUDE.md said
// "item four on Fury's checklist" and was correct. A later commit inserted a
// new item at position four in MISSION.md and never touched the sentence, so
// no diff of added lines could ever see it. The check has to run the other
// way: when a diff changes a file, look through EVERY tracked record for a
// positional reference into that file.
{
  say(`\n=== positional references INTO the files this diff changes ===`);
  let flagged = 0;
  const allRecords = git(["ls-files", "--", "*.md"]).split("\n").filter(Boolean);
  for (const changed of changedFiles) {
    const base = changed.split("/").pop().replace(/\.md$/, "");
    if (!base) continue;
    for (const rec of allRecords) {
      let body;
      try {
        body = git(["show", `${range.split("..")[1] || "HEAD"}:${rec}`]);
      } catch {
        continue;
      }
      for (const line of body.split("\n")) {
        if (
          /\b(item|step|point|rule)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i.test(
            line,
          ) &&
          line.toLowerCase().includes(base.toLowerCase())
        ) {
          flagged++;
          REVIEW(
            `${rec} may count a position into ${changed}, which this diff ` +
              `changes: "${line.trim().slice(0, 120)}". Re-count it — this ` +
              `exact shape went stale inside one commit on 2026-09-06.`,
          );
        }
      }
    }
  }
  if (flagged === 0) {
    OK(
      `no record NAMES a file this diff changes and counts a position into ` +
        `it. Known limit, stated rather than hidden: a reference that ` +
        `describes its target instead of naming it ("item four on Fury's ` +
        `checklist") cannot be matched this way, and that is exactly the ` +
        `2026-09-06 case. Scanning every positional reference in every record ` +
        `on any change would flag 40 of them, mostly vendored docs — noise ` +
        `that gets a gate ignored. The real mitigation is CHECK 3: do not ` +
        `write positional references, name the item.`,
    );
  }
}

say("");
if (hardFailures === 0 && reviewCount === 0) {
  say(`RECORDCHECK CLEAR — nothing decidable failed, nothing flagged.`);
} else if (hardFailures === 0) {
  say(
    `RECORDCHECK — 0 hard failures, but ${reviewCount} item(s) NEED YOUR ` +
      `JUDGEMENT above.\nEvery false claim this tool exists for produced ` +
      `zero hard failures and sat in a REVIEW line.`,
  );
} else {
  say(
    `RECORDCHECK FAILED — ${hardFailures} hard failure(s). ` +
      `Fix the record before it is committed.`,
  );
}
process.exit(hardFailures === 0 ? 0 : 1);
