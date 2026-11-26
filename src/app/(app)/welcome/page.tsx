import { WelcomeSteps } from "@/components/WelcomeSteps";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { NARROW_PAGE_CLASSES } from "@/lib/gridClasses";
import { PERSON_SELECT, toPersonInfo } from "@/lib/personInfo";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * Where a new family's admin lands after setup: add people, then install help.
 * Admins only: `requireRole` sends anyone else to `/` (login honours
 * `after=/welcome` for every account, so a non-admin can arrive here). The
 * people are added through the same Server Action as Manage family, which
 * checks the admin again.
 */
export default async function WelcomePage() {
  await requireRole("admin");

  const rows = await db.user.findMany({
    where: { deactivatedAt: null, role: { not: "device" } },
    select: PERSON_SELECT,
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="py-2" data-page-width="wide">
      <div className={NARROW_PAGE_CLASSES}>
        <WelcomeSteps initialPeople={rows.map(toPersonInfo)} />
      </div>
    </div>
  );
}
