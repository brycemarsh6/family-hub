import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { tabletMayCompleteAnyTask } from "@/lib/tabletRules";
import { BackLink } from "@/components/BackLink";
import { CalendarSearch } from "@/components/CalendarSearch";
import type { CalendarPersonView } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Calendar search (mission 75). The Calendar's top-bar Search circle lands here.
 * Everyone who can see the Calendar may search, so there is no role gate: the
 * `canManage` and `isTablet` flags are derived exactly as `calendar/page.tsx`
 * does, only to decide which controls the sheets show (every write action still
 * checks the session itself). The roster is the Calendar's: active people plus
 * anyone assigned to a task, so a task's avatars resolve even if that person
 * was since deactivated. The matching itself is the `searchCalendar` action's.
 */
export default async function CalendarSearchPage() {
  const user = await requireVerifiedUser();
  const canManage = MANAGER_ROLES.includes(user.role);
  const isTablet = tabletMayCompleteAnyTask(user.role);

  const roster = await db.user.findMany({
    where: { OR: [{ deactivatedAt: null }, { taskPeople: { some: {} } }] },
    select: { id: true, displayName: true, avatarColor: true, deactivatedAt: true },
    orderBy: { createdAt: "asc" },
  });
  const people: CalendarPersonView[] = roster.map((person) => ({
    userId: person.id,
    displayName: person.displayName,
    avatarColor: person.avatarColor,
    deactivated: person.deactivatedAt !== null,
  }));

  return (
    <div className="py-2" data-page-width="wide">
      <BackLink href="/calendar" label="Calendar" />
      <CalendarSearch people={people} canManage={canManage} isTablet={isTablet} />
    </div>
  );
}
