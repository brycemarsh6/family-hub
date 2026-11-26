import { WelcomeSteps } from "@/components/WelcomeSteps";
import { requireRole } from "@/lib/dal";
import { NARROW_PAGE_CLASSES } from "@/lib/gridClasses";
import { loadHouseholdPersonInfos } from "@/lib/householdPeople";

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

  const people = await loadHouseholdPersonInfos();

  return (
    <div className="py-2" data-page-width="wide">
      <div className={NARROW_PAGE_CLASSES}>
        <WelcomeSteps initialPeople={people} />
      </div>
    </div>
  );
}
