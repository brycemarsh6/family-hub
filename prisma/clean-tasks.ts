// Removes the test data seeded by seed-tasks.ts: the tasks, matched on
// BOTH their exact "ZZZ Test"-prefixed title AND a sentinel marker in
// `details` (TASK_SEED_SENTINEL, task-seed-data.ts) — never the
// household's own real tasks, which live in this same table.
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
// The title-AND-sentinel pair is what actually makes "refuses to touch a
// real task" true. An earlier version of this script matched on title
// alone and its comment claimed the same "refuses" guarantee — that claim
// was FALSE, and was caught by direct test (mission-13/C6, following up on
// Vision's mission-13 pass-1 finding): a task created through the real
// `createTask` action, titled exactly a seed template's title, was deleted
// by this script. Title alone can't tell a real task from a test one when
// a household member happens to reuse a template's words; the sentinel in
// `details` is a marker only this seeder ever writes, so the two together
// give the same "refuses to delete" failure direction the meal-plan
// scripts' entry-set fingerprint was built around: safer to leave a
// possible test row alone than to risk a real one. See this file's own
// C6-added evidence in mission-13.md for the plant-and-survive proof.
//
// Run with:  npm run db:clean-tasks

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { TASK_SEED_TEMPLATES, TASK_SEED_SENTINEL } from "./task-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const taskTitles = TASK_SEED_TEMPLATES.map((t) => t.title);
  const { count: tasksDeleted } = await db.task.deleteMany({
    where: { title: { in: taskTitles }, details: { contains: TASK_SEED_SENTINEL } },
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
