// Fake linked Google accounts, for looking at the Synced calendars page
// (mission 55) without a real Google link. One account per manager (the
// first admin and the first parent), each with two calendars.
//
// Run with:  npm run db:seed-linked-calendars
// Clean up with:  npm run db:clean-linked-calendars
//
// IMPORTANT: this only writes LinkedAccount and LinkedCalendar rows, plus
// four fake events (mission 56) with their sync rows. It reads the User table
// for ids and never writes to it (AGENTS.md danger register).
// Every account has a googleSubject starting "zz-m55-" so the clean script
// can remove exactly these rows. The stored token is a fixed fake string that
// cannot be decrypted, so nothing here can ever reach Google. Safe to re-run:
// each account is upserted on its (userId, googleSubject) pair, and each fake
// event is only created when no event with its title exists yet. The fake
// events are titled "zz-m56 ..." so the clean script can find exactly them.
//
// Uses relative imports because tsx runs this outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const SUBJECT_PREFIX = "zz-m55-";
const FAKE_TOKEN = "zz-m55-not-a-real-token";

const EVENT_PREFIX = "zz-m56 ";
const FAKE_GOOGLE_EVENT_ID = "zz-m56-not-a-real-google-event";

// One fake event per sync state the detail sheet can show.
const FAKE_EVENTS = [
  { title: `${EVENT_PREFIX}copied ok`, status: "ok", failReason: null },
  { title: `${EVENT_PREFIX}failed network`, status: "failed", failReason: "network" },
  { title: `${EVENT_PREFIX}failed reconnect`, status: "failed", failReason: "reconnect" },
  { title: `${EVENT_PREFIX}removing`, status: "removing", failReason: null },
];

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

  let firstMainCalendarId: string | null = null;
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
      const row = await db.linkedCalendar.upsert({
        where: {
          accountId_googleCalendarId: { accountId: account.id, googleCalendarId: calendar.googleCalendarId },
        },
        update: {},
        create: { accountId: account.id, ...calendar },
        select: { id: true },
      });
      if (manager === managers[0] && calendar.isPrimary) firstMainCalendarId = row.id;
    }
  }

  // Fake events tomorrow, for the first manager, on their fake Main calendar.
  let eventsMade = 0;
  if (firstMainCalendarId) {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    for (const fake of FAKE_EVENTS) {
      const existing = await db.calendarEvent.findFirst({
        where: { title: fake.title },
        select: { id: true },
      });
      if (existing) continue;
      await db.calendarEvent.create({
        data: {
          title: fake.title,
          startAt: start,
          endAt: end,
          createdById: managers[0].id,
          syncs: {
            create: {
              linkedCalendarId: firstMainCalendarId,
              googleEventId: FAKE_GOOGLE_EVENT_ID,
              status: fake.status,
              failReason: fake.failReason,
            },
          },
        },
      });
      eventsMade += 1;
    }
  }

  console.log(
    `Seeded ${managers.length} fake linked account(s), prefix ${SUBJECT_PREFIX}; ${eventsMade} new fake event(s), prefix "${EVENT_PREFIX}".`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
