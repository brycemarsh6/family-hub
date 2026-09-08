#!/usr/bin/env node
// Fury's preflight — run this BEFORE dispatching a contract.
//
// WHY THIS EXISTS. One failure shape has now hit this project SIX times —
// four contract boundaries across missions 13, 14, 16 and 17, plus two in a
// single session's own record corrections. Every one was a *negative or
// quantitative claim about what already exists*, asserted without running
// the command that settles it:
//
//   1. mission-16/C3  — "two roster queries". There are four, one of them a
//                       create page with different semantics, and the real
//                       blocker sat in the FORBIDDEN `actions/**`.
//                       BLOCKED-ON-CONTRACT; the builder was right to refuse.
//   2. mission-13/C4  — forbade the only file that could satisfy the
//                       contract's own done-criteria (the Add sheet was
//                       already real; the brief said it wasn't).
//   3. mission-14/C5  — forbade `TaskForm.tsx` without checking it ALREADY
//                       implemented edit, so a second edit form got built and
//                       the original's edit branch went dead.
//   4. mission-17/C2  — omitted `tasks` from `TimelineGrid`'s props, so tasks
//                       vanished from Day/3 Day/Week — the three views the
//                       picker defaults into. A kid could not complete a
//                       chore from the view they land on.
//   5. 2026-09-06     — a CLAUDE.md *correction* counted headings in a
//                       mission file, found no C5, and concluded C5 never
//                       existed. `git log` shows it shipped. Same shape, in
//                       prose rather than a contract.
//   6. 2026-09-06     — the FIX for an overclaim ("tested across every DST
//                       transition") asserted the coverage lived "only in"
//                       two named files. A third had two dedicated cases.
//                       Two false claims introduced by corrections in one
//                       session; both were caught by a gate, neither by
//                       re-reading. That is the argument for this tool.
//
// A sixth shape rides along because it is mechanically identical to check and
// has hit SEVEN times: a contract dispatched with its boundary living only in
// the dispatch prompt, so a gate auditing scope has nothing to audit against.
// (mission-14 C3b/C5/C6, mission-15 C3b/C5, mission-17 C5/C7. An earlier
// version of this header said five — it counted only what the entry in front
// of it listed, which is the same shape as every incident above.)
//
// WHAT THIS TOOL IS NOT. It cannot read intent. Checks 4 and 5 SURFACE claims
// for a human to settle; they do not settle them. A clean run means "the
// mechanical traps are clear", never "this contract is correct". Saying so is
// the point — this project's named defect class is tooling that claims more
// than it verified.
//
// USAGE
//   node preflight.mjs <mission-file> [contract-id]
//   node preflight.mjs .avengers/missions/mission-18-preflight.md C1
//   node preflight.mjs .avengers/missions/mission-18-preflight.md   # all
//
// Exit 0 = no hard failure. Exit 1 = at least one hard failure (a FAIL line).
// WARN and REVIEW never change the exit code; they are for a human to read.

import { readFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
// Shared with recordcheck.mjs. One definition of what counts as a claim —
// two copies of this regex would drift, and its subtleties were each learned
// from a real miss.
import {
  findClaims,
  findIdentifiers,
  filesDefining,
  filesReferencing,
} from "./lib/claims.mjs";

const [, , missionPath, onlyContract] = process.argv;

if (!missionPath) {
  console.error("usage: node preflight.mjs <mission-file> [contract-id]");
  process.exit(2);
}
if (!existsSync(missionPath)) {
  console.error(`preflight: mission file not found: ${missionPath}`);
  process.exit(2);
}

const repoRoot = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return process.cwd();
  }
})();

const mission = readFileSync(missionPath, "utf8");

// ---------------------------------------------------------------- parsing --

/**
 * Split the mission into contract blocks keyed by id ("C1", "C3b", ...).
 *
 * A block runs from its `### C<id> — ...` heading to the NEXT contract
 * heading or the next top-level `## ` section — deliberately NOT to the next
 * `###`. Real mission files carry `###` sub-headings inside a contract's
 * narrative ("### ⚠️ Two findings from C2 that need a ruling"), and an
 * earlier version of this parser stopped there, truncating the block before
 * its own Boundaries line and then reporting the boundary as MISSING.
 * That is this tool's own defect class — claiming absence from a search that
 * could not have found the thing — caught by running it against a real
 * mission file rather than a fixture.
 */
function parseContracts(text) {
  const lines = text.split("\n");
  const blocks = [];
  let current = null;
  for (const line of lines) {
    // Contract ids are NOT always C-prefixed. This repo's own history uses
    // B1-B6, CB1-CB7, DB1, F1, S1-S5 as well — 20 ids the old `C`-only
    // pattern was structurally blind to, across 103 vs 126 headings. Since
    // preflight is item one on the dispatch checklist, every one of those
    // was either dispatched unpreflighted or hard-failed and worked around.
    // Found 2026-09-08 by a fix contract named F1 failing to preflight.
    // The 1-3 uppercase bound is what keeps narrative sub-headings out
    // ("### Captain pass 1 — BLOCKED" has a lowercase second char, so it
    // cannot match); verified 0 wrongly-matched headings across all missions.
    const heading = line.match(/^###\s+([A-Z]{1,3}[0-9]+[a-z]?)\s*[—-]/);
    if (heading) {
      if (current) blocks.push(current);
      current = { id: heading[1], heading: line, body: [] };
      continue;
    }
    if (/^##\s/.test(line) && current) {
      blocks.push(current);
      current = null;
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) blocks.push(current);
  // A mission may legitimately carry two blocks for one id (e.g. a
  // SUPERSEDED first draft). Keep the LAST, and say so.
  const byId = new Map();
  for (const b of blocks) {
    b.text = b.body.join("\n");
    if (byId.has(b.id)) b.duplicateOf = true;
    byId.set(b.id, b);
  }
  return { byId, blocks };
}

/** Pull `may touch` / `must not touch` path lists off a Boundaries line. */
function parseBoundaries(body) {
  const m = body.match(/\*\*Boundaries:\*\*([\s\S]*?)(?:\n\s*-\s\*\*|\n#{2,3}\s|$)/);
  if (!m) return null;
  const raw = m[1];
  const [mayRaw, mustRaw] = raw.split(/·|\bmust not touch\b/i).length > 1
    ? (() => {
        const idx = raw.search(/\bmust not touch\b/i);
        return idx === -1 ? [raw, ""] : [raw.slice(0, idx), raw.slice(idx)];
      })()
    : [raw, ""];

  const grab = (chunk) => {
    const out = [];
    const re = /(new\s+)?`([^`]+)`/g;
    let g;
    while ((g = re.exec(chunk))) {
      const path = g[2].trim();
      // A boundary line legitimately contains backticked PROSE as well as
      // paths — a prop shape (`{anchor, onPickMonth}`), a symbol name, a
      // parenthetical. Treating those as paths produced a hard FAIL on
      // mission-19/C3 for a file that was never claimed to exist, which is
      // the tool crying wolf: the contract was right and the tool was wrong.
      // A path candidate must actually look like one — a directory
      // separator, a file extension, or a glob. Anything else is recorded
      // as skipped rather than dropped silently, because a genuinely
      // mistyped path must not vanish into this filter.
      const looksLikePath =
        path.includes("/") || path.includes("*") || /\.[a-z0-9]+$/i.test(path);
      if (looksLikePath) out.push({ path, isNew: Boolean(g[1]) });
      else out.push({ path, isNew: Boolean(g[1]), notAPath: true });
    }
    return out;
  };
  return {
    raw: raw.trim().replace(/\s+/g, " "),
    may: grab(mayRaw.replace(/^\s*may touch/i, "")),
    mustNot: grab(mustRaw),
  };
}

// ------------------------------------------------------------- file facts --

/** Is this boundary entry a glob rather than one file? */
function isGlob(p) {
  return p.includes("*") || p.endsWith("/");
}

/**
 * Resolve a possibly-bare filename to real repo paths.
 * Globs (`src/app/actions/**`, `src/lib/`) are legitimate in a must-not-touch
 * list and are expanded through `git ls-files`, not treated as missing files.
 */
function resolvePath(p) {
  if (isGlob(p)) {
    const base = p.endsWith("/") ? `${p}**` : p;
    // Boundaries are written the way a human refers to them — `actions/**`
    // means src/app/actions, not a top-level directory. Try the literal
    // pattern, then the same pattern anywhere in the tree, exactly as bare
    // filenames are resolved below.
    for (const pattern of [base, `*/${base}`]) {
      try {
        const out = execFileSync("git", ["ls-files", "--", pattern], {
          cwd: repoRoot,
          encoding: "utf8",
        })
          .split("\n")
          .filter(Boolean)
          .map((f) => join(repoRoot, f));
        if (out.length > 0) return out;
      } catch {
        /* git ls-files exits non-zero on a bad pattern */
      }
    }
    return [];
  }
  const direct = resolve(repoRoot, p);
  if (existsSync(direct) && statSync(direct).isFile()) return [direct];
  if (p.includes("/")) return [];
  // Bare filename — the mission files do this constantly. Find it.
  try {
    const found = execFileSync(
      "git",
      ["ls-files", "--", `*/${p}`, p],
      { cwd: repoRoot, encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean)
      .map((f) => join(repoRoot, f));
    return found;
  } catch {
    return [];
  }
}

/**
 * Total and code lines. "Code" = non-blank, not a whole-line `//`, `/*`, `*`
 * or `*​/`. HEURISTIC, and deliberately reported as one: STRUCTURE.md asks
 * for BOTH counts precisely because the code count is a judgement aid, not a
 * gate. Do not let this number alone authorise growing a file.
 */
function lineCounts(file) {
  const raw = readFileSync(file, "utf8");
  const src = raw.split("\n");
  // Match `wc -l` semantics. A file ending in a newline yields a trailing ""
  // from split(), which made an earlier version of this report every file as
  // one line longer than the constitution's own numbers — it called
  // TimelineGrid.tsx 650/650 when `wc -l` says 649. An off-by-one in the
  // instrument that measures the hard cap is exactly the kind of number this
  // project has been burned by quoting.
  if (src.length > 0 && src[src.length - 1] === "") src.pop();
  const total = src.length;
  let code = 0;
  let inBlock = false;
  for (const line of src) {
    const t = line.trim();
    if (!t) continue;
    if (inBlock) {
      // `*/}` closes a JSX comment, `*/` a plain one.
      if (t.includes("*/")) inBlock = false;
      continue;
    }
    // `{/* … */}` is this repo's DOMINANT documentation form inside .tsx,
    // and an earlier version of this counter missed it entirely — it tested
    // `startsWith("/*")`, which a JSX comment never satisfies because it
    // opens with `{`. Captain caught it: the same file read 237 code lines
    // by this heuristic and 108 by a JSX-aware count, and STRUCTURE.md's
    // size clause takes that number as its judgement input. A counter that
    // over-reports code exactly where the rule is meant to protect prose
    // argues for splitting the files that explain themselves best.
    if (t.startsWith("{/*") || t.startsWith("/*")) {
      if (!t.includes("*/")) inBlock = true;
      continue;
    }
    if (t.startsWith("//") || t.startsWith("*")) continue;
    code++;
  }
  return { total, code };
}



/** Local shim: the shared helpers take an explicit repoRoot. */
const filesDefining_ = (sym) => filesDefining(sym, repoRoot);

// ---------------------------------------------------------------- reporting --

let hardFailures = 0;
let reviewCount = 0;
const say = (s = "") => console.log(s);
const FAIL = (s) => {
  hardFailures++;
  say(`  ✗ FAIL   ${s}`);
};
const WARN = (s) => say(`  ! WARN   ${s}`);
const REVIEW = (s) => {
  reviewCount++;
  say(`  ? REVIEW ${s}`);
};
const OK = (s) => say(`  ✓ ok     ${s}`);

// ------------------------------------------------------------------ checks --

const { byId } = parseContracts(mission);
const targets = onlyContract
  ? [byId.get(onlyContract)].filter(Boolean)
  : [...byId.values()];

if (onlyContract && targets.length === 0) {
  // CHECK 1, the sharpest one: five contracts in this project's history were
  // dispatched with no written contract at all.
  say(`\n=== ${onlyContract} ===`);
  FAIL(
    `no "### ${onlyContract} — ..." heading in ${missionPath}. A boundary that ` +
      `lives only in the dispatch prompt is not a boundary — a gate auditing ` +
      `scope has nothing to audit against. This has happened 7 times.`,
  );
  say(`\n${hardFailures} hard failure(s).`);
  process.exit(1);
}

say(`preflight — ${missionPath}`);
say(`repo: ${repoRoot}`);

// CHECK 6 (cross-contract): parallel dispatches must not share a may-touch file.
const mayByContract = new Map();

for (const c of targets) {
  say(`\n=== ${c.id} ===`);
  if (c.duplicateOf) {
    WARN(`more than one "### ${c.id}" block in this file — checking the LAST. ` +
      `A superseded draft should say SUPERSEDED in its heading.`);
  }

  const b = parseBoundaries(c.text);

  // CHECK 1 — the contract is written down, with a boundary.
  if (!b) {
    FAIL(
      `no "**Boundaries:**" line. Seven contracts in this project shipped with ` +
        `the boundary only in the dispatch prompt; a gate could not audit scope.`,
    );
    continue;
  }
  OK(`boundaries parsed: ${b.raw.slice(0, 100)}${b.raw.length > 100 ? "…" : ""}`);
  if (b.may.length === 0) {
    WARN(`parsed zero may-touch paths — check the format, not just this report.`);
  }
  mayByContract.set(c.id, b.may.map((f) => f.path));

  // CHECK 2 — every path resolves, and `new` really is new.
  for (const f of [...b.may, ...b.mustNot]) {
    const found = resolvePath(f.path);
    if (f.isNew) {
      if (found.length > 0) {
        FAIL(
          `\`${f.path}\` is marked "new" but ALREADY EXISTS ` +
            `(${found.map((x) => x.replace(repoRoot + "/", "")).join(", ")}). ` +
            `This is how a duplicate gets written beside a live definition.`,
        );
      } else {
        OK(`\`${f.path}\` — new, does not exist yet`);
      }
      continue;
    }
    if (f.notAPath) {
      WARN(
        `\`${f.path}\` in the boundary is not path-shaped (no \`/\`, no ` +
          `extension, no glob) — read as prose, not checked as a file. If ` +
          `that was meant to be a path, it is mistyped.`,
      );
      continue;
    }
    if (found.length === 0) {
      FAIL(
        `\`${f.path}\` does not exist and is not marked "new". Either the path ` +
          `is wrong or the premise about what exists is wrong.`,
      );
    } else if (isGlob(f.path)) {
      OK(`\`${f.path}\` — glob, matches ${found.length} file(s)`);
    } else if (found.length > 1) {
      WARN(
        `\`${f.path}\` is ambiguous — ${found.length} matches: ` +
          `${found.map((x) => x.replace(repoRoot + "/", "")).join(", ")}. ` +
          `Name the full path in the boundary.`,
      );
    }
  }

  // CHECK 3 — re-measure caps. Never quote a line count from a report.
  for (const f of b.may) {
    const found = resolvePath(f.path);
    if (found.length !== 1) continue;
    const { total, code } = lineCounts(found[0]);
    const rel = found[0].replace(repoRoot + "/", "");
    const note = `${rel} — ${total} total / ~${code} code`;
    if (total > 650) {
      FAIL(`${note} — OVER the 650 hard cap before this contract adds a line.`);
    } else if (total > 600) {
      // REVIEW, not WARN: "Extract first" is an instruction, and STRUCTURE.md
      // carries a trip condition saying exactly that for the file which
      // triggers this. A gate pointed out that printing CLEAR over it was the
      // wrong headline, and it was right.
      REVIEW(`${note} — ${650 - total} lines from the HARD cap. Extract first.`);
    } else if (total > 350) {
      WARN(`${note} — over the 350 soft cap (code is the judgement aid; ` +
        `the cap is measured on total).`);
    } else {
      OK(note);
    }
  }

  // CHECK 4 — is a symbol the contract needs DEFINED in a forbidden file?
  // This is incidents 1, 2 and 3, and it is the check that pays for the tool.
  const mustNotFiles = new Set();
  for (const f of b.mustNot) resolvePath(f.path).forEach((p) => mustNotFiles.add(p));
  // Take the LEADING identifier out of backtick content rather than
  // requiring the whole span to be one. Replay found `deactivatedAt: null`
  // was skipped entirely because of the ": null" — and `deactivatedAt` was
  // the field the miscounted claim was about.
  const symbols = findIdentifiers(c.text);
  let clashes = 0;
  for (const sym of symbols) {
    const defs = filesDefining_(sym);
    const forbidden = defs.filter((d) => mustNotFiles.has(join(repoRoot, d)));
    if (forbidden.length > 0) {
      clashes++;
      FAIL(
        `\`${sym}\` is DEFINED in a must-not-touch file (${forbidden.join(", ")}). ` +
          `Either the contract cannot be satisfied inside its boundary, or the ` +
          `builder will duplicate the definition. Both have happened here.`,
      );
    }
  }
  if (clashes === 0 && symbols.size > 0) {
    OK(`${symbols.size} named symbol(s) — none defined inside a must-not-touch file`);
  }

  // CHECK 4b — the may-touch code depends on forbidden code.
  // Gap found by replay: check 4 only inspects symbols the contract NAMES,
  // but in incident 1 the blocker (`validatedPeople`) was precisely the thing
  // the contract failed to name. This check does not care what the contract
  // says — it reads the import graph.
  const forbiddenImports = [];
  for (const f of b.may) {
    const found = resolvePath(f.path);
    if (found.length !== 1) continue;
    const src = readFileSync(found[0], "utf8");
    for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
      const spec = m[1];
      const tail = spec.split("/").pop();
      if (!tail) continue;
      for (const mn of mustNotFiles) {
        const mnBase = mn.split("/").pop().replace(/\.(tsx?|mjs|js)$/, "");
        if (tail === mnBase) {
          forbiddenImports.push(
            `${found[0].replace(repoRoot + "/", "")} imports \`${spec}\` → ` +
              `${mn.replace(repoRoot + "/", "")}`,
          );
        }
      }
    }
  }
  if (forbiddenImports.length > 0) {
    REVIEW(
      `may-touch code DEPENDS on must-not-touch code. If the behaviour you ` +
        `are changing is decided over there, the contract cannot be satisfied ` +
        `inside its boundary — that is exactly what BLOCKED-ON-CONTRACT means:`,
    );
    for (const fi of forbiddenImports) say(`           • ${fi}`);
  }

  // CHECK 5 — surface every negative / quantitative claim for a human.
  // The tool cannot settle these. It can refuse to let them pass unread.
  //
  // The cardinal half of this regex was widened after a replay: the original
  // only matched "only two" / "two of", so it read straight past incident 1's
  // actual sentence — "Two roster queries filter `deactivatedAt: null`" —
  // and reported the contract clear. A claim does not announce itself with
  // the word "only". Noise here is the correct trade: the check's job is to
  // put a claim in front of a human, not to be precise about which.
  const claims = findClaims(c.text);

  // Every backticked identifier, with how many files actually reference it.
  // This is what lets a human check "two roster queries" against reality
  // without leaving the report.
  const refCounts = [];
  for (const sym of symbols) {
    const files = filesReferencing(sym, repoRoot);
    if (files.length > 0) refCounts.push({ sym, files });
  }

  if (claims.length === 0) {
    OK(`no negative/quantitative claims detected in the contract text`);
  } else {
    REVIEW(
      `${claims.length} claim(s) about what exists or how many. THIS TOOL ` +
        `CANNOT SETTLE THEM — run the command that does, for each:`,
    );
    for (const cl of claims) {
      say(`           • ${cl.length > 160 ? cl.slice(0, 160) + "…" : cl}`);
    }
  }
  if (refCounts.length > 0) {
    say(`           — reference counts for every identifier this contract names,`);
    say(`             so a "two X" claim can be checked against reality here:`);
    for (const { sym, files } of refCounts.sort((a, b) => b.files.length - a.files.length)) {
      say(
        `             \`${sym}\` → ${files.length} file(s): ` +
          files.slice(0, 5).join(", ") +
          (files.length > 5 ? `, +${files.length - 5} more` : ""),
      );
    }
  }
  say(`           Reminder: a heading count is not an existence check — ` +
    `use \`git log\`. That is incident 5.`);
}

// CHECK 6 — parallel contracts must own disjoint files.
if (targets.length > 1) {
  say(`\n=== cross-contract ===`);
  const seen = new Map();
  let overlap = 0;
  for (const [id, files] of mayByContract) {
    for (const f of files) {
      if (seen.has(f)) {
        overlap++;
        FAIL(
          `\`${f}\` is may-touch in BOTH ${seen.get(f)} and ${id}. ` +
            `Dispatch these serially, or merge them — overlapping parallel ` +
            `builders produce merge chaos no gate can untangle.`,
        );
      } else {
        seen.set(f, id);
      }
    }
  }
  if (overlap === 0) OK(`no file appears in two contracts' may-touch lists`);
}

// ----------------------------------------------------------------- verdict --

say("");
if (hardFailures === 0 && reviewCount === 0) {
  say(
    `PREFLIGHT CLEAR — 0 hard failures, nothing flagged for judgement.\n` +
      `This means the MECHANICAL traps are clear. It does NOT mean the ` +
      `contract is correct.`,
  );
} else if (hardFailures === 0) {
  // Deliberately not the word "clear". The incident this tool exists for
  // produced zero hard failures on replay and was still a wrong contract;
  // a tool that prints CLEAR over unread REVIEW lines is doing the exact
  // overclaiming this project keeps getting burned by.
  say(
    `PREFLIGHT — 0 hard failures, but ${reviewCount} item(s) NEED YOUR ` +
      `JUDGEMENT above.\nDo not dispatch until each is settled by running ` +
      `the command that settles it. On replay, the contract that produced ` +
      `this project's worst boundary error looked exactly like this.`,
  );
} else {
  say(`PREFLIGHT FAILED — ${hardFailures} hard failure(s). Fix the contract, not the builder.`);
}
process.exit(hardFailures === 0 ? 0 : 1);
