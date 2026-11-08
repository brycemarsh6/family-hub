// Fake linked Google accounts, for looking at the Synced calendars page
// (mission 55) without a real Google link. One account per manager (the
// first admin and the first parent), each with two calendars.
//
// Run with:  npm run db:seed-linked-calendars
// Clean up with:  npm run db:clean-linked-calendars
//
// IMPORTANT: this only writes LinkedAccount and LinkedCalendar rows. It reads
// the User table for ids and never writes to it (AGENTS.md danger register).
// Every account has a googleSubject starting "zz-m55-" so the clean script
// can remove exactly these rows. The stored token is a fixed fake string that
// cannot be decrypted, so nothing here can ever reach Google. Safe to re-run:
// each account is upserted on its (userId, googleSubject) pair.
//
// Uses relative imports because tsx runs this outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const SUBJECT_PREFIX = "zz-m55-";
const FAKE_TOKEN = "zz-m55-not-a-real-token";

const CALENDARS = [
  { googleCalendarId: "primary", name: "Main calendar", isPrimary: true, direction: "twoWay" },
  { googleCalendarId: "family", name: "Family", isPrimary: false, direction: "off" },
];

async function main() {
  const managers: { id: string; role: string }[] = [];
  for (const role of ["admin", "parent"]) {
    const found = await db.user.findFirst({
      where: { role, deactivatedAt: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, role: true },
    });
    if (found) managers.push(found);
  }

  if (managers.length === 0) {
    console.error(
      "No admin or parent found to attach fake accounts to. Nothing seeded. Run npm run db:bootstrap-users first.",
    );
    process.exit(1);
  }

  for (const manager of managers) {
    const subject = `${SUBJECT_PREFIX}${manager.role}`;
    const account = await db.linkedAccount.upsert({
      where: { userId_googleSubject: { userId: manager.id, googleSubject: subject } },
      update: {},
      create: {
        userId: manager.id,
        googleSubject: subject,
        email: `${subject}@example.invalid`,
        label: manager.role === "admin" ? "Work" : null,
        encryptedRefreshToken: FAKE_TOKEN,
        scopes: "fake",
      },
      select: { id: true },
    });
    for (const calendar of CALENDARS) {
      await db.linkedCalendar.upsert({
        where: {
          accountId_googleCalendarId: { accountId: account.id, googleCalendarId: calendar.googleCalendarId },
        },
        update: {},
        create: { accountId: account.id, ...calendar },
      });
    }
  }

  console.log(`Seeded ${managers.length} fake linked account(s), prefix ${SUBJECT_PREFIX}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
