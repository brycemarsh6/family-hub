// Attacks the first-run setup and the recovery code against a database built
// from nothing, and proves every refused try writes nothing. CI runs it right
// after the fresh-database crons step (see .github/workflows/ci.yml); it keeps
// the attack list from mission 91 as a permanent regression check.
//
// Run as: node --import tsx prisma/setup-attack-smoke.ts
// The app's `server-only` imports throw outside Next, so the script stubs that
// one module below, the same way prisma/fresh-db-smoke.ts does.
//
// It refuses any DATABASE_URL whose host is not localhost or 127.0.0.1, so it
// can never touch Neon, and refuses to start unless the User table is empty.
// The only rows it ever deletes are LoginAttempt rows, in that throwaway
// database, to reset the rate limit between cases.

import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);

function hostOf(url: string | undefined): string | null {
  try {
    return new URL(url ?? "").hostname;
  } catch {
    return null;
  }
}

const host = hostOf(process.env.DATABASE_URL);
if (host !== "localhost" && host !== "127.0.0.1") {
  console.error(
    `setup-attack-smoke: refusing to run, DATABASE_URL host is ${host ? `"${host}"` : "missing or unreadable"}. Only localhost or 127.0.0.1 is allowed.`,
  );
  process.exit(1);
}

function check(ok: boolean, label: string, shown?: unknown): void {
  if (!ok) {
    throw new Error(`${label}${shown === undefined ? "" : ` -> ${JSON.stringify(shown)}`}`);
  }
}

async function main(): Promise<void> {
  // Imported after the host check so a refused run never loads the client.
  require.cache[require.resolve("server-only")] = { exports: {} } as unknown as NodeJS.Module;
  const { db } = await import("../src/lib/db");
  const { MEAL_SLOTS } = await import("../src/lib/constants");
  const { USER_FAILURE_LIMIT } = await import("../src/lib/loginRateLimitPolicy");
  const { SETUP_RATE_LIMIT_KEY } = await import("../src/lib/setupGate");
  const { isSetupOpen, checkSetupLinkFlow, createFamilyFlow } = await import("../src/lib/setupFlow");
  const { resetWithRecoveryCodeFlow, RECOVERY_WRONG, RECOVERY_LIMITED } = await import(
    "../src/lib/recoveryFlow"
  );
  const { verifyPassword, hashPassword } = await import("../src/lib/password");
  const { newRecoveryCode } = await import("../src/lib/recoveryCode");
  const { createFamilyAndFirstAdmin } = await import("../src/lib/householdSettingsWrites");

  const counts = async () => ({
    users: await db.user.count(),
    settings: await db.householdSettings.count(),
    tags: await db.tag.count(),
  });
  const clearAttempts = async (userId: string) => {
    await db.loginAttempt.deleteMany({ where: { userId } });
  };
  const adminState = async (userId: string) => {
    const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    const row = await db.householdSettings.findUnique({
      where: { id: "household" },
      select: { recoveryCodeHash: true },
    });
    return { passwordHash: user?.passwordHash ?? null, recoveryCodeHash: row?.recoveryCodeHash ?? null };
  };
  const line = (n: number, text: string) => console.log(`ok ${String(n).padStart(2)} ${text}`);

  try {
    if ((await db.user.count()) !== 0) throw new Error("User table is not empty, refusing to run");
    const zero = await counts();
    check(zero.users === 0 && zero.settings === 0 && zero.tags === 0, "start state not empty", zero);

    const GOOD_CODE = `test-${randomBytes(12).toString("hex")}`;
    const PASSWORD = "first password 1";
    const input = (over: Partial<Parameters<typeof createFamilyFlow>[0]> = {}) => ({
      code: GOOD_CODE,
      familyName: "Attack Family",
      displayName: "First Admin",
      password: PASSWORD,
      passwordAgain: PASSWORD,
      ...over,
    });
    const expectRefusedUnchanged = async (label: string, run: () => Promise<unknown>, want: unknown) => {
      const before = await counts();
      const got = await run();
      check(JSON.stringify(got) === JSON.stringify(want), `${label}: result`, got);
      const after = await counts();
      check(JSON.stringify(before) === JSON.stringify(after), `${label}: counts changed`, { before, after });
    };

    // 1. owner copy
    process.env.MARSHEE_OWNER_COPY = "1";
    process.env.SETUP_CODE = GOOD_CODE;
    check((await isSetupOpen()) === false, "owner copy: setup open");
    await expectRefusedUnchanged("owner link", () => checkSetupLinkFlow(GOOD_CODE, "10.0.0.1"), "bad");
    await expectRefusedUnchanged("owner create", () => createFamilyFlow(input(), "10.0.0.1"), { status: "bad" });
    delete process.env.MARSHEE_OWNER_COPY;
    line(1, "owner copy refused");

    // 2. SETUP_CODE unset
    delete process.env.SETUP_CODE;
    check((await isSetupOpen()) === false, "no SETUP_CODE: setup open");
    await expectRefusedUnchanged("unset link", () => checkSetupLinkFlow(GOOD_CODE, "10.0.0.1"), "bad");
    await expectRefusedUnchanged("unset create", () => createFamilyFlow(input(), "10.0.0.1"), { status: "bad" });
    line(2, "SETUP_CODE unset refused");

    // 3. positive control
    process.env.SETUP_CODE = GOOD_CODE;
    check((await isSetupOpen()) === true, "positive control: setup not open");
    line(3, "setup is open with a code set and no owner flag");

    // 4. missing code
    await clearAttempts(SETUP_RATE_LIMIT_KEY);
    await expectRefusedUnchanged("missing link", () => checkSetupLinkFlow("", "10.0.0.2"), "bad");
    await expectRefusedUnchanged("missing create", () => createFamilyFlow(input({ code: "" }), "10.0.0.2"), {
      status: "bad",
    });
    line(4, "missing code refused");

    // 5. wrong code
    await clearAttempts(SETUP_RATE_LIMIT_KEY);
    await expectRefusedUnchanged("wrong link", () => checkSetupLinkFlow("not-the-code", "10.0.0.3"), "bad");
    await expectRefusedUnchanged("wrong create", () => createFamilyFlow(input({ code: "not-the-code" }), "10.0.0.3"), {
      status: "bad",
    });
    line(5, "wrong code refused");

    // 6. flood
    await clearAttempts(SETUP_RATE_LIMIT_KEY);
    for (let i = 0; i < USER_FAILURE_LIMIT; i++) {
      await expectRefusedUnchanged(`flood ${i + 1}`, () => checkSetupLinkFlow(`guess-${i}`, "10.0.0.9"), "bad");
    }
    await expectRefusedUnchanged("flood limited", () => checkSetupLinkFlow("guess-next", "10.0.0.9"), "limited");
    await expectRefusedUnchanged("flood right code link", () => checkSetupLinkFlow(GOOD_CODE, "10.0.0.9"), "limited");
    await expectRefusedUnchanged("flood right code create", () => createFamilyFlow(input(), "10.0.0.9"), {
      status: "limited",
    });
    await clearAttempts(SETUP_RATE_LIMIT_KEY);
    await expectRefusedUnchanged("after reset link", () => checkSetupLinkFlow(GOOD_CODE, "10.0.0.9"), "ok");
    line(6, "flood limited, right code refused while limited, ok after reset");

    // 7. bad input with the right code
    await expectRefusedUnchanged("short password", () => createFamilyFlow(input({ password: "short", passwordAgain: "short" }), "10.0.0.4"), {
      error: "Passwords must be at least 8 characters.",
    });
    await expectRefusedUnchanged("mismatch", () => createFamilyFlow(input({ passwordAgain: "something else 2" }), "10.0.0.4"), {
      error: "Those passwords don't match.",
    });
    line(7, "bad input refused");

    // 8. two creates at once. Drives the write itself, with hashes made in
    // advance, so both transactions start together and the conflict path is
    // the one that decides (the flow's bcrypt time would spread them out).
    const hashes = await Promise.all(
      ["A", "B"].map(async (tag) => {
        const fresh = newRecoveryCode();
        return {
          tag,
          code: fresh.code,
          passwordHash: await hashPassword(PASSWORD),
          recoveryCodeHash: await hashPassword(fresh.plain),
        };
      }),
    );
    const results = await Promise.all(
      hashes.map((h) =>
        createFamilyAndFirstAdmin({
          familyName: `Winner ${h.tag}`,
          displayName: `Admin ${h.tag}`,
          passwordHash: h.passwordHash,
          recoveryCodeHash: h.recoveryCodeHash,
        }),
      ),
    );
    const winners = results.filter((r) => "userId" in r);
    const losers = results.filter((r) => "closed" in r);
    check(winners.length === 1 && losers.length === 1, "two at once: not exactly one winner", results);
    const afterCreate = await counts();
    check(
      afterCreate.users === 1 && afterCreate.settings === 1 && afterCreate.tags === MEAL_SLOTS.length,
      "two at once: counts",
      afterCreate,
    );
    const winnerIndex = results.findIndex((r) => "userId" in r);
    const winnerTag = hashes[winnerIndex].tag;
    const winner = {
      userId: (results[winnerIndex] as { userId: string }).userId,
      recoveryCode: hashes[winnerIndex].code,
    };
    const settings = await db.householdSettings.findUnique({ where: { id: "household" } });
    check(
      !!settings && settings.setupFinishedAt !== null && settings.familyName === `Winner ${winnerTag}`,
      "two at once: settings row",
      settings,
    );
    const admin = await db.user.findUnique({ where: { id: winner.userId } });
    check(admin?.role === "admin" && !!admin.passwordHash, "winner is an admin with a password");
    line(8, "two at once made exactly one admin");

    // 9. replay, sequentially through the whole flow with the right code
    await expectRefusedUnchanged("replay", () => createFamilyFlow(input({ familyName: "Winner A", displayName: "Admin A" }), "10.0.0.5"), {
      status: "bad",
    });
    check((await isSetupOpen()) === false, "setup still open after finish");
    line(9, "replay refused, setup closed");

    // Recovery cases
    const adminId = winner.userId;
    const unchanged = async (label: string, before: Awaited<ReturnType<typeof adminState>>) => {
      const after = await adminState(adminId);
      check(JSON.stringify(after) === JSON.stringify(before), `${label}: admin state changed`);
    };
    const NEW_PW = "second password 2";
    const recover = (userId: string, code: string, pw = NEW_PW) =>
      resetWithRecoveryCodeFlow({ userId, code, newPassword: pw, newPasswordAgain: pw }, "10.0.0.7");

    // 10. unknown user
    let before = await adminState(adminId);
    let got = await recover("no-such-user", winner.recoveryCode);
    check("error" in got && got.error === RECOVERY_WRONG, "unknown user result", got);
    await unchanged("unknown user", before);
    line(10, "recovery for an unknown user refused");

    // 11. wrong code
    got = await recover(adminId, "AAAA-BBBB-CCCC-DDDD");
    check("error" in got && got.error === RECOVERY_WRONG, "wrong recovery code result", got);
    await unchanged("wrong code", before);
    line(11, "wrong recovery code refused");

    // 12. right code
    got = await recover(adminId, winner.recoveryCode);
    check("recoveryCode" in got, "right recovery code result", got);
    const usedCode = winner.recoveryCode;
    let currentCode = (got as { recoveryCode: string }).recoveryCode;
    const state12 = await adminState(adminId);
    check(
      !!state12.passwordHash && (await verifyPassword(NEW_PW, state12.passwordHash)),
      "new password does not verify",
    );
    check(state12.recoveryCodeHash !== before.recoveryCodeHash && currentCode !== usedCode, "code hash did not change");
    line(12, "right code reset the password and issued a new code");

    // 13. reuse
    before = await adminState(adminId);
    got = await recover(adminId, usedCode, "third password 3");
    check("error" in got && got.error === RECOVERY_WRONG, "reuse result", got);
    await unchanged("reuse", before);
    line(13, "old recovery code refused");

    // 14. same code twice at once
    const [r1, r2] = await Promise.all([
      recover(adminId, currentCode, "parallel password 1"),
      recover(adminId, currentCode, "parallel password 2"),
    ]);
    const okOnes = [r1, r2].filter((r) => "recoveryCode" in r);
    check(okOnes.length === 1, "two at once: not exactly one success", [r1, r2]);
    currentCode = (okOnes[0] as { recoveryCode: string }).recoveryCode;
    const winnerPassword = "recoveryCode" in r1 ? "parallel password 1" : "parallel password 2";
    const loserPassword = "recoveryCode" in r1 ? "parallel password 2" : "parallel password 1";
    const state14 = await adminState(adminId);
    check(
      !!state14.passwordHash &&
        (await verifyPassword(winnerPassword, state14.passwordHash)) &&
        !(await verifyPassword(loserPassword, state14.passwordHash)),
      "two at once: stored password is not the winner's alone",
    );
    line(14, "same recovery code twice at once worked once");

    // 15. recovery flood
    await clearAttempts(adminId);
    before = await adminState(adminId);
    let limitedAt = -1;
    for (let i = 0; i < USER_FAILURE_LIMIT + 2; i++) {
      const r = await recover(adminId, "ZZZZ-ZZZZ-ZZZZ-ZZZZ");
      if ("error" in r && r.error === RECOVERY_LIMITED) {
        limitedAt = i + 1;
        break;
      }
      check("error" in r && r.error === RECOVERY_WRONG, "flood try result", r);
    }
    check(limitedAt === USER_FAILURE_LIMIT + 1, "recovery flood limited at the wrong try", limitedAt);
    got = await recover(adminId, currentCode);
    check("error" in got && got.error === RECOVERY_LIMITED, "right code while limited", got);
    await unchanged("recovery flood", before);
    line(15, "recovery flood limited, right code refused while limited");

    // 16 to 18: accounts that must never recover, each with the right current
    // code and nothing changed. Users made here are never deleted (the CI
    // database is thrown away); the script only deletes LoginAttempt rows.
    await clearAttempts(adminId);
    const otherHash = await hashPassword("some other pw 9");
    const refusedRecovery = async (n: number, text: string, userId: string, code: string) => {
      await clearAttempts(userId);
      const settingsBefore = await adminState(adminId);
      const targetBefore = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
      const countsBefore = await counts();
      const r = await recover(userId, code);
      check("error" in r && r.error === RECOVERY_WRONG, `${text}: result`, r);
      const targetAfter = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
      check(targetAfter?.passwordHash === targetBefore?.passwordHash, `${text}: password changed`);
      check(JSON.stringify(await counts()) === JSON.stringify(countsBefore), `${text}: counts changed`);
      await unchanged(text, settingsBefore);
      line(n, text);
    };

    // 16. a kid with a password
    const kid = await db.user.create({
      data: { displayName: "ZZZ Kid", role: "kid", passwordHash: otherHash, avatarColor: "blue" },
      select: { id: true },
    });
    await refusedRecovery(16, "recovery for a kid account refused", kid.id, currentCode);

    // 17. a second admin, deactivated
    const gone = await db.user.create({
      data: { displayName: "ZZZ Gone", role: "admin", passwordHash: otherHash, avatarColor: "blue", deactivatedAt: new Date() },
      select: { id: true },
    });
    await refusedRecovery(17, "recovery for a deactivated admin refused", gone.id, currentCode);

    // 18. no stored code at all, with the right old code in hand
    await db.householdSettings.update({ where: { id: "household" }, data: { recoveryCodeHash: null } });
    await refusedRecovery(18, "recovery with no stored code refused", adminId, currentCode);
  } finally {
    await db.$disconnect();
  }
}

main().then(
  () => {
    console.log("setup-attack-smoke: all cases passed");
    process.exit(0);
  },
  (error) => {
    console.error("setup-attack-smoke: FAILED:", error);
    process.exit(1);
  },
);
