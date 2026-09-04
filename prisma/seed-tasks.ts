// Task-only test data, for exercising CT1's Task model (create, complete,
// the kid-membership completion guard, and the fixed all-day storage
// convention) without touching anything else.
//
// Run with:  npm run db:seed-tasks
// Clean up with:  npm run db:clean-tasks
//
// IMPORTANT: this only ever touches Task and TaskPerson — never pantry,
// grocery, recipes, meal plans, calendar events, or the User table. Same
// discipline as prisma/seed-calendar.ts (see that file's own header for
// the fuller history): a committed, rerunnable script may never create,
// update, or delete `User` rows (AGENTS.md's danger register —
// `displayName` carries no `@unique` constraint, so a name-matched delete
// could catch a row this script never created, including a same-named row
// that later gained a real login). This script ATTACHES its test tasks to
// whichever real people already exist in the database — it never writes to
// the User table in either direction.
//
// Needs at least 3 real (non-deactivated) User rows to run — see main()
// below for the exact check and the error it prints if there aren't
// enough. Real accounts are created with `npm run db:bootstrap-users`.
//
// This script always runs from a real machine, never on Vercel — so unlike
// the app's own server code, it's safe for it to build "today" with
// `new Date()` here. See src/lib/calendarDates.ts's own header for why
// that's NOT safe inside the app itself.
//
// A Task's dueDate is stored as a UTC-midnight instant (mission-13/CT1's
// fixed all-day convention — see Task.dueDate's schema comment), so every
// due date below is built through calendarDates.ts's
// localDayToAllDayInstant, never a bare `new Date(y, m, d)`.
//
// Uses relative imports (not the "@/" shortcut) because this script is run
// directly by tsx, outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { addDays, startOfDay } from "../src/lib/mealPlanDates";
import { localDayToAllDayInstant } from "../src/lib/calendarDates";
import { TASK_SEED_TEMPLATES } from "./task-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const PEOPLE_NEEDED = 3;

async function main() {
  // Attach to real people rather than creating our own — see this file's
  // own header. Ordered by createdAt so a repeat run picks the same three
  // people every time (stable, not "whichever the database feels like").
  const people = await db.user.findMany({
    where: { deactivatedAt: null },
    orderBy: { createdAt: "asc" },
    take: PEOPLE_NEEDED,
    select: { id: true },
  });

  if (people.length < PEOPLE_NEEDED) {
    console.error(
      `Need at least ${PEOPLE_NEEDED} real people in the database to seed task test ` +
        `data (found ${people.length}). This script attaches its test tasks to real ` +
        `people rather than creating its own — see AGENTS.md's danger register on the ` +
        `User table. Run \`npm run db:bootstrap-users\` first to create real household ` +
        `accounts/profiles, then re-run this script.`,
    );
    process.exit(1);
  }

  const today = startOfDay(new Date());

  const taskTitles = TASK_SEED_TEMPLATES.map((t) => t.title);
  await db.task.deleteMany({ where: { title: { in: taskTitles } } });

  for (const template of TASK_SEED_TEMPLATES) {
    const dueDay = addDays(today, template.dueDayOffset);
    const dueDate = localDayToAllDayInstant(dueDay);

    await db.task.create({
      data: {
        title: template.title,
        details: template.details ?? null,
        dueDate,
        completedAt: template.completed ? new Date() : null,
        people: {
          create: template.people.map((index) => ({ userId: people[index].id })),
        },
      },
    });
  }

  console.log(
    `Seeded ${taskTitles.length} test tasks, attached to ${people.length} existing people.`,
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
