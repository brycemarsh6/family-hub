// Proves a database built from nothing by `prisma migrate deploy` works: runs
// the calendar pull and the briefing reads against it and checks they find
// nothing and do not crash. CI runs it (see .github/workflows/ci.yml).
//
// Run as: node --import tsx prisma/fresh-db-smoke.ts
// The app's `server-only` imports throw outside Next, so the script stubs that
// one module below. (Node's react-server condition would also silence it, but
// it strips createContext out of React, which lucide-react needs at import.)
//
// It refuses any DATABASE_URL whose host is not localhost or 127.0.0.1, so it
// can never touch Neon.

import { createRequire } from "node:module";

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
    `fresh-db-smoke: refusing to run, DATABASE_URL host is ${host ? `"${host}"` : "missing or unreadable"}. Only localhost or 127.0.0.1 is allowed.`,
  );
  process.exit(1);
}

function expectEmpty(label: string, ok: boolean, shown: unknown): void {
  console.log(`fresh-db-smoke: ${label} -> ${JSON.stringify(shown)}`);
  if (!ok) throw new Error(`${label} was not empty`);
}

async function main(): Promise<void> {
  // Imported after the host check so a refused run never loads the client.
  require.cache[require.resolve("server-only")] = { exports: {} } as unknown as NodeJS.Module;
  const { db } = await import("../src/lib/db");
  const { pullCalendars } = await import("../src/lib/calendarEventPull");
  const { loadHouseholdAdults, loadHouseholdPeople } = await import("../src/lib/householdPeople");
  const { loadBriefingShared } = await import("../src/lib/briefingRead");
  const { calendarDateInZone } = await import("../src/lib/householdDate");
  const { HOUSEHOLD_TIME_ZONE } = await import("../src/lib/constants");

  try {
    const pull = await pullCalendars({ force: true, rewindow: true });
    expectEmpty("calendar pull", pull.checked === 0 && pull.failed === 0, pull);

    const adults = await loadHouseholdAdults();
    expectEmpty("household adults", adults.length === 0, adults.length);

    const people = await loadHouseholdPeople();
    expectEmpty("household people", people.length === 0, people.length);

    const shared = await loadBriefingShared(calendarDateInZone(new Date(), HOUSEHOLD_TIME_ZONE));
    // Meals always lists every slot of the day; on an empty plan each title is null.
    const plannedMeals = shared.meals.filter((meal) => meal.title !== null).length;
    expectEmpty(
      "briefing shared reads",
      shared.events.length === 0 && shared.tasks.length === 0 && shared.meals.length > 0 && plannedMeals === 0,
      { events: shared.events.length, tasks: shared.tasks.length, mealSlots: shared.meals.length, plannedMeals },
    );
  } finally {
    await db.$disconnect();
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error("fresh-db-smoke: failed:", error);
    process.exit(1);
  },
);
