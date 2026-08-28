// Interactive, idempotent bootstrap for real household people — accounts
// and non-login profiles — run once by Bryce in his own terminal after P1's
// gates pass. See .avengers/plans/family-accounts-v1.md and the Family
// Accounts v1 mission for the full design.
//
// Deliberately NOT a "seed" script, and deliberately has no clean/reset
// counterpart: it prompts for real names and real passwords rather than
// writing anything invented, upserts by displayName so re-running it never
// duplicates a person, and this repo already has a documented history of
// blanket-clearing scripts nearly destroying real data (see the recipe and
// meal-plan seed scripts' own history in CLAUDE.md). A destructive
// counterpart for the table holding the whole family's login credentials is
// not a script this project should ever have.
//
// Passwords are read from stdin with the terminal's echo suppressed (see
// askHidden below) and are hashed immediately — nothing about a password is
// ever logged, printed, or written anywhere but the hash column.
//
// Run with:  npm run db:bootstrap-users

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import readline from "node:readline";
import { ROLES, AVATAR_COLORS, type Role, type AvatarColor } from "../src/lib/constants";
import { hashPassword } from "../src/lib/password";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set — refusing to run. Copy .env.example to .env " +
      "and fill it in first.",
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// A queue of complete lines, fed by the interface's own 'line' event, rather
// than sequential rl.question() calls. This matters for exactly the case
// this script's own verification uses: piped stdin (`printf ... | tsx
// bootstrap-users.ts`) delivers every line to the input stream almost
// instantly, while our prompts do real async work between them (bcrypt
// hashing, a database round trip). rl.question() only attaches a one-shot
// 'line' listener for the instant it's called — any line that arrives while
// we're still awaiting the previous step fires with nobody listening and is
// silently dropped. Queuing every line as it arrives, and having `ask`
// consume from that queue (or wait for the next one), is correct regardless
// of whether input is typed slowly by a human or delivered all at once by a
// pipe.
const pendingLines: string[] = [];
const lineWaiters: ((line: string) => void)[] = [];
rl.on("line", (line) => {
  const waiter = lineWaiters.shift();
  if (waiter) waiter(line);
  else pendingLines.push(line);
});

function nextLine(): Promise<string> {
  const queued = pendingLines.shift();
  if (queued !== undefined) return Promise.resolve(queued);
  return new Promise((resolve) => lineWaiters.push(resolve));
}

/** A plain, visible prompt. */
function ask(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  return nextLine();
}

/**
 * A prompt whose typed characters never echo to the screen — used only for
 * passwords. There's no public readline API for this; muting the
 * interface's own internal render hook (`_writeToOutput`) is the standard
 * technique for a plain `readline` password prompt, not a security control
 * on its own — nothing about stdin is ever logged regardless of whether the
 * terminal happens to echo it.
 */
async function askHidden(prompt: string): Promise<string> {
  const mutable = rl as unknown as { _writeToOutput?: (text: string) => void };
  const original = mutable._writeToOutput;
  process.stdout.write(prompt);
  mutable._writeToOutput = () => {};
  const answer = await nextLine();
  mutable._writeToOutput = original;
  process.stdout.write("\n");
  return answer;
}

// Device mode (the wall tablet) is created later, through the admin UI
// (Phase 3+) — this script is for real people only.
const PERSON_ROLES = ROLES.filter((role) => role !== "device") as Exclude<Role, "device">[];

async function askRole(): Promise<Exclude<Role, "device">> {
  for (;;) {
    const raw = (await ask(`  Role (${PERSON_ROLES.join("/")}) [kid]: `)).trim().toLowerCase();
    if (raw === "") return "kid";
    if ((PERSON_ROLES as string[]).includes(raw)) return raw as Exclude<Role, "device">;
    console.log(`  Please type one of: ${PERSON_ROLES.join(", ")}.`);
  }
}

async function askTier(): Promise<"account" | "profile"> {
  for (;;) {
    const raw = (
      await ask("  Account (can sign in) or profile (no login)? [account/profile]: ")
    )
      .trim()
      .toLowerCase();
    if (raw === "account" || raw === "profile") return raw;
    console.log('  Please type "account" or "profile".');
  }
}

/**
 * `allowKeepCurrent` is only offered when there's an existing password to
 * keep — an empty first entry then means "leave it exactly as it is" (`null`
 * return) rather than "empty password" (which was always rejected). Without
 * that option, updating someone's role alone would force a full password
 * retype every time the script is re-run.
 */
async function askPassword(options: { allowKeepCurrent?: boolean } = {}): Promise<string | null> {
  const prompt = options.allowKeepCurrent
    ? "  Password (leave blank to keep the current password): "
    : "  Password: ";
  for (;;) {
    const first = await askHidden(prompt);
    if (first.length === 0) {
      if (options.allowKeepCurrent) return null;
      console.log("  Password can't be empty.");
      continue;
    }
    const second = await askHidden("  Password again: ");
    if (first !== second) {
      console.log("  Those didn't match — let's try again.");
      continue;
    }
    return first;
  }
}

/** A plain typed confirmation — visible, not a password, nothing hidden. */
async function askConfirmExactly(prompt: string, expected: string): Promise<boolean> {
  return (await ask(prompt)).trim() === expected;
}

type Summary = { displayName: string; role: Exclude<Role, "device">; tier: "account" | "profile" };

/**
 * Create or update one person, keyed on displayName (exact, case-sensitive —
 * same "no provider-specific collation" reasoning as every other name lookup
 * in this schema). Re-running with an existing name updates their role and
 * password/profile status instead of creating a duplicate row; their
 * avatarColor is left untouched on an update; a fresh person is assigned the
 * next unused swatch NAME in AVATAR_COLORS for a little variety across a
 * bootstrap run.
 *
 * Two guards live here specifically because this script is re-run to make
 * role-only changes, not just to add new people:
 *
 * - Picking "account" for someone who already has a password lets the
 *   password prompt come back empty to mean "keep the current one" — so
 *   changing just a role never forces a password retype.
 * - Picking "profile" for someone who already has a password would
 *   otherwise silently null their `passwordHash` and lock them out until
 *   this script is run again. That's surfaced as an explicit warning
 *   naming them, requiring a typed "yes" — anything else leaves their
 *   existing hash completely untouched (only their role, if changed,
 *   still applies).
 */
async function addOnePerson(colorIndex: number): Promise<Summary> {
  let displayName = "";
  while (displayName.length === 0) {
    displayName = (await ask("  Display name: ")).trim();
    if (displayName.length === 0) console.log("  A name is required.");
  }

  const existing = await db.user.findFirst({ where: { displayName } });

  const role = await askRole();
  const tier = await askTier();

  // `undefined` means "don't touch this column" in Prisma's `data` object —
  // the same convention `editGroceryItem`'s `categoryEdited` flag relies on
  // (see CLAUDE.md's Put-away review plan, P2) — used below whenever the
  // confirmed choice is to leave an existing hash exactly as it is.
  let passwordHash: string | null | undefined;

  if (tier === "account") {
    if (existing?.passwordHash) {
      const typed = await askPassword({ allowKeepCurrent: true });
      passwordHash = typed === null ? undefined : await hashPassword(typed);
    } else {
      passwordHash = await hashPassword((await askPassword()) as string);
    }
  } else if (existing?.passwordHash) {
    console.log("");
    console.log(
      `  ⚠️  "${displayName}" currently has a password and can sign in. Switching them to a ` +
        "profile will REMOVE their password — they won't be able to sign in again until this " +
        "script is re-run to set a new one.",
    );
    const confirmed = await askConfirmExactly(
      '  Type "yes" to remove their password, or anything else to leave it untouched: ',
      "yes",
    );
    if (confirmed) {
      passwordHash = null;
    } else {
      passwordHash = undefined;
      console.log(`  Leaving "${displayName}"'s existing password untouched.`);
    }
  } else {
    passwordHash = null;
  }

  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role, passwordHash } });
    console.log(`  Updated existing person "${displayName}".`);
  } else {
    const avatarColor: AvatarColor = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length].name;
    await db.user.create({
      data: { displayName, role, passwordHash: passwordHash ?? null, avatarColor },
    });
    console.log(`  Created "${displayName}".`);
  }

  return { displayName, role, tier };
}

async function main() {
  console.log("Marsh HQ — add household members (accounts and profiles).");
  console.log(
    "Re-running with the same display name updates that person instead of duplicating them.\n",
  );

  const summary: Summary[] = [];

  for (;;) {
    const prompt = summary.length === 0 ? "Add a person? (y/n) [y]: " : "Add another person? (y/n) [y]: ";
    const answer = (await ask(prompt)).trim().toLowerCase();
    if (answer === "n" || answer === "no") break;

    summary.push(await addOnePerson(summary.length));
    console.log("");
  }

  console.log("Summary (passwords/hashes are never shown here or anywhere else):");
  if (summary.length === 0) {
    console.log("  Nothing added.");
  } else {
    console.table(summary);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await db.$disconnect();
  });
