import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });
  const events = await db.calendarEvent.findMany({
    select: { id: true, title: true, startAt: true, endAt: true, allDay: true },
    orderBy: { startAt: "asc" },
  });
  console.log("COUNT:" + events.length);
  for (const e of events) {
    console.log(`${e.id} | ${e.title} | ${e.startAt.toISOString()} -> ${e.endAt.toISOString()} | allDay=${e.allDay}`);
  }
  await db.$disconnect();
}
main();
