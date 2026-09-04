// Removes the test data seeded by seed-tasks.ts: the tasks, matched by
// their exact "ZZZ Test"-prefixed titles — never the household's own real
// tasks, which live in this same table.
//
// This script touches ONLY Task (its TaskPerson rows cascade with it,
// schema-level). It never touches the User table in either direction —
// seed-tasks.ts attaches its test tasks to whichever real people already
// exist rather than creating its own, so there is no test person for this
// script to remove. See AGENTS.md's danger register and
// prisma/clean-calendar.ts's own history (mission-8's Captain B1 finding):
// a committed script that creates or deletes `User` rows is forbidden
// outright, because `displayName` carries no `@unique` constraint and a
// name-matched delete can catch a row the seeder never created — including
// a same-named row that later gained a real login.
//
// Deliberately matches ONLY rows whose title is an exact seed-title match —
// it refuses to touch a real task, even one a household member happened to
// title identically to a test row, because deleteMany's `in` filter matches
// on the title string alone and nothing here re-checks who created it or
// when. That's the same "refuses to delete" failure direction the
// meal-plan scripts' entry-set fingerprint was built around: safer to
// leave a possible test row alone than to risk a real one.
//
// Run with:  npm run db:clean-tasks

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { TASK_SEED_TEMPLATES } from "./task-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const taskTitles = TASK_SEED_TEMPLATES.map((t) => t.title);
  const { count: tasksDeleted } = await db.task.deleteMany({
    where: { title: { in: taskTitles } },
  });

  console.log(`Deleted ${tasksDeleted} test tasks. No User rows touched.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
