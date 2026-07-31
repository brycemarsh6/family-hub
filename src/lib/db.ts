import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// This file creates the one object we use everywhere to talk to the database.
//
// Why the `globalThis` dance below: in development, Next.js reloads your code
// every time you save a file. If we simply wrote `new PrismaClient()`, a brand
// new database connection would be created on every save, and after a few dozen
// edits the app would fall over having run out of connections. Stashing the
// client on `globalThis` (which survives reloads) means we make it once and
// reuse it. In production the code only loads once, so this is a no-op.

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
