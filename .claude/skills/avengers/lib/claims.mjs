// Shared claim-detection, used by BOTH preflight.mjs (contracts) and
// recordcheck.mjs (records). One definition, because this project's own
// constitution says a rule enforced from two copies is a rule that drifts —
// and because the regex below is subtle enough that a second copy would.
//
// The subtlety, recorded where the next editor will stand: the cardinal
// branch must NOT begin with (?:^|\s). An earlier version had it, and it
// fought the outer \b, killing the whole branch. It read past "Two roster
// queries filter …" — the exact sentence behind this project's worst
// boundary error — while a differently-punctuated sentence still matched,
// which is how a half-working regex reads as a working one.

import { execFileSync } from "node:child_process";

/**
 * Sentences that assert something about what exists, or how many.
 * Deliberately noisy: the job is to put a claim in front of a human, not to
 * be precise about which sentences qualify. A missed claim is the failure
 * mode that costs a mission; a surplus one costs a glance.
 */
export const CLAIM_RE = new RegExp(
  "[^.\\n]*\\b(" +
    "never (?:built|existed|implemented|written)|" +
    "does not (?:exist|yet)|doesn't (?:exist|yet)|there (?:is|are) no|" +
    "no such|not yet built|nothing (?:reads|calls|imports|uses)|" +
    "the (?:only|sole)|only (?:the|one|in)|" +
    "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|" +
    "thirteen|both|all|each|every|\\d+)\\s+" +
    "(?:[a-z][a-z-]*\\s+){0,2}[a-z][a-z-]*s\\b" +
    ")[^.\\n]*(?:\\.|—|$)",
  "gim",
);

/** Every claim sentence in a blob of text, de-duplicated and tidied. */
export function findClaims(text) {
  return [
    ...new Set(
      [...text.matchAll(CLAIM_RE)].map((m) =>
        m[0].trim().replace(/\s+/g, " "),
      ),
    ),
  ];
}

/**
 * Identifiers named in backticks. Paths are excluded (they are not symbols),
 * and bare lowercase words are dropped as prose — `null`, `style`, `scroll`
 * once buried the one line that mattered on a real run.
 */
export function findIdentifiers(text) {
  return new Set(
    [...text.matchAll(/`([^`]+)`/g)]
      .map((m) => m[1].trim())
      .filter((t) => !t.includes("/") && !/\.(tsx?|mjs|jsx?|css|json|md)$/.test(t))
      .map((t) => (t.match(/^[A-Za-z_$][A-Za-z0-9_$]{2,}/) || [])[0])
      .filter(Boolean)
      .filter((t) => /[A-Z_]/.test(t) || t.length > 8),
  );
}

/** Backticked things that look like a file path or filename. */
export function findPathLikes(text) {
  return new Set(
    [...text.matchAll(/`([^`]+)`/g)]
      .map((m) => m[1].trim())
      .filter((t) => /\.(tsx?|mjs|jsx?|css|json|md)$/.test(t) || t.includes("/"))
      .filter((t) => !t.startsWith("@/") && !t.startsWith("http")),
  );
}

/** Files that reference a symbol at all (not necessarily defining it). */
export function filesReferencing(symbol, repoRoot) {
  try {
    return execFileSync(
      "git",
      ["grep", "-lF", symbol, "--", "*.ts", "*.tsx", "*.mjs"],
      { cwd: repoRoot, encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Files that DEFINE a symbol. */
export function filesDefining(symbol, repoRoot) {
  const patterns = [
    `(export\\s+)?(async\\s+)?function\\s+${symbol}\\b`,
    `(export\\s+)?(const|let|class|type|interface|enum)\\s+${symbol}\\b`,
  ];
  const hits = new Set();
  for (const pat of patterns) {
    try {
      execFileSync(
        "git",
        ["grep", "-lE", pat, "--", "*.ts", "*.tsx", "*.mjs", "*.js"],
        { cwd: repoRoot, encoding: "utf8" },
      )
        .split("\n")
        .filter(Boolean)
        .forEach((f) => hits.add(f));
    } catch {
      /* git grep exits 1 when nothing matches */
    }
  }
  return [...hits];
}
