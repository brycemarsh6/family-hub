// Fake linked Google accounts, for looking at the Synced calendars page
// (mission 55) without a real Google link. One account per manager (the
// first admin and the first parent), each with two calendars, plus a third
// "needs reconnecting" account (mission 58) and two events pulled from Google.
//
// Run with:  npm run db:seed-linked-calendars
// Clean up with:  npm run db:clean-linked-calendars
//
// IMPORTANT: this only writes LinkedAccount and LinkedCalendar rows, plus
// four fake events (mission 56) and two fake pulled events (mission 58), each
// with their sync rows. It reads the User table
// for ids and never writes to it (AGENTS.md danger register).
// Every account has a googleSubject starting "zz-m55-" so the clean script
// can remove exactly these rows. The stored token is a fixed fake string that
// cannot be decrypted, so nothing here can ever reach Google. Safe to re-run:
// each account is upserted on its (userId, googleSubject) pair, and each fake
// event is only created when no event with its title exists yet. The fake
// events are titled "zz-m56 ..." (and "zz-m58 ..." for the pulled ones) so the
// clean script can find exactly them. A pull on dev fails at decryption of the
// fake token and calls nothing.
//
// Uses relative imports because tsx runs this outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { HOUSEHOLD_TIME_ZONE } from "../src/lib/constants";
import {
  addCalendarDays,
  calendarDateInZone,
  utcMidnightInstant,
  zoneOffsetMs,
  type CalendarDate,
} from "../src/lib/householdDate";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const SUBJECT_PREFIX = "zz-m55-";
const FAKE_TOKEN = "zz-m55-not-a-real-token";

const EVENT_PREFIX = "zz-m56 ";
const FAKE_GOOGLE_EVENT_ID = "zz-m56-not-a-real-google-event";

const RELINK_SUBJECT = "zz-m55-relink";
// Its own Google calendar id: sharing "primary" would make a second on-link of the Main calendar.
const RELINK_CALENDAR = "zz-m58-old";
const PULLED_PREFIX = "zz-m58 ";

/** The UTC instant of `hour`:00 on `date` as read on a Denver wall clock. */
function denverHour(date: CalendarDate, hour: number): Date {
  const wallAsUtc = Date.UTC(date.year, date.month - 1, date.day, hour);
  return new Date(wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), HOUSEHOLD_TIME_ZONE));
}

// One fake event per sync state the detail sheet can show.
const FAKE_EVENTS = [
  { title: `${EVENT_PREFIX}copied ok`, status: "ok", failReason: null },
  { title: `${EVENT_PREFIX}failed network`, status: "failed", failReason: "network" },
  { title: `${EVENT_PREFIX}failed reconnect`, status: "failed", failReason: "reconnect" },
  { title: `${EVENT_PREFIX}removing`, status: "removing", failReason: null },
];

const CALENDARS = [
  { googleCalendarId: "primary", name: "Main calendar", isPrimary: true, direction: "off" },
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
  const otherMainCalendarIds: string[] = [];
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
      if (calendar.isPrimary) {
        if (manager === managers[0]) firstMainCalendarId = row.id;
        else otherMainCalendarIds.push(row.id);
      }
    }
  }

  // Mission 58: the first fake account's Main calendar is "twoWay" and was
  // pulled 2 minutes ago (set on every run, so re-running refreshes it). The
  // other fake accounts' Main calendars are the same Google calendar, and only
  // one link of a Google calendar may be on, so they are set "off" here.
  if (firstMainCalendarId) {
    const pulled = new Date(Date.now() - 2 * 60 * 1000);
    await db.linkedCalendar.update({
      where: { id: firstMainCalendarId },
      data: { direction: "twoWay", lastPulledAt: pulled, lastPulledOkAt: pulled },
    });
  }
  if (otherMainCalendarIds.length > 0) {
    await db.linkedCalendar.updateMany({
      where: { id: { in: otherMainCalendarIds } },
      data: { direction: "off" },
    });
  }

  // Mission 58: a third fake account, owned by the first admin, that needs
  // reconnecting, with one two-way calendar.
  const admin = managers.find((m) => m.role === "admin") ?? managers[0];
  const relinkAccount = await db.linkedAccount.upsert({
    where: { userId_googleSubject: { userId: admin.id, googleSubject: RELINK_SUBJECT } },
    update: {},
    create: {
      userId: admin.id,
      googleSubject: RELINK_SUBJECT,
      email: `${RELINK_SUBJECT}@example.invalid`,
      label: "Needs reconnecting",
      encryptedRefreshToken: FAKE_TOKEN,
      scopes: "fake",
      status: "needs-relink",
    },
    select: { id: true },
  });
  await db.linkedCalendar.upsert({
    where: {
      accountId_googleCalendarId: { accountId: relinkAccount.id, googleCalendarId: RELINK_CALENDAR },
    },
    update: {},
    create: {
      accountId: relinkAccount.id,
      googleCalendarId: RELINK_CALENDAR,
      name: "Old calendar",
      isPrimary: true,
      direction: "twoWay",
    },
    select: { id: true },
  });

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
              // One id per fake event: the (calendar, Google id) pair is unique (mission 58).
              googleEventId: `${FAKE_GOOGLE_EVENT_ID}-${FAKE_EVENTS.indexOf(fake)}`,
              status: fake.status,
              failReason: fake.failReason,
            },
          },
        },
      });
      eventsMade += 1;
    }
  }

  // Mission 58: two events "pulled from Google" onto the first Main calendar,
  // owned by that account's owner. One timed (tomorrow 2 to 3 PM Denver), one
  // all-day (the day after).
  let pulledMade = 0;
  if (firstMainCalendarId) {
    const tomorrow = addCalendarDays(calendarDateInZone(new Date(), HOUSEHOLD_TIME_ZONE), 1);
    const dayAfter = addCalendarDays(tomorrow, 1);
    const pulled = [
      {
        title: `${PULLED_PREFIX}from Google timed`,
        googleEventId: "zz-m58-g1",
        allDay: false,
        startAt: denverHour(tomorrow, 14),
        endAt: denverHour(tomorrow, 15),
      },
      {
        title: `${PULLED_PREFIX}from Google all-day`,
        googleEventId: "zz-m58-g2",
        allDay: true,
        startAt: utcMidnightInstant(dayAfter),
        endAt: utcMidnightInstant(addCalendarDays(dayAfter, 1)),
      },
    ];
    for (const fake of pulled) {
      const existing = await db.calendarEvent.findFirst({
        where: { title: fake.title },
        select: { id: true },
      });
      if (existing) continue;
      await db.calendarEvent.create({
        data: {
          title: fake.title,
          startAt: fake.startAt,
          endAt: fake.endAt,
          allDay: fake.allDay,
          createdById: managers[0].id,
          sourceLinkedCalendarId: firstMainCalendarId,
          people: { create: { userId: managers[0].id } },
          syncs: {
            create: {
              linkedCalendarId: firstMainCalendarId,
              googleEventId: fake.googleEventId,
              status: "ok",
              lastPulledAt: new Date(),
            },
          },
        },
      });
      pulledMade += 1;
    }
  }

  console.log(
    `Seeded ${managers.length} fake linked account(s), prefix ${SUBJECT_PREFIX}; ${eventsMade} new fake event(s), prefix "${EVENT_PREFIX}"; ${pulledMade} new fake pulled event(s), prefix "${PULLED_PREFIX}".`,
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
