import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { FamilyList } from "@/components/FamilyList";
import { FamilyOrderList } from "@/components/FamilyOrderList";
import { HOUSEHOLD_ORDER_BY, HOUSEHOLD_PERSON_WHERE } from "@/lib/householdPeople";
import { PERSON_SELECT, toPersonInfo, type PersonInfo } from "@/lib/personInfo";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * Admin-only: every household member, with a per-person action sheet
 * (rename, change role, avatar colour, reset password, upgrade a profile
 * to an account, deactivate/reactivate) and a way to add someone new.
 * `requireRole("admin")` bounces anyone else to `/` before this renders —
 * see mission-6's C3 contract and dal.ts's own doc comment on why a page
 * uses the redirecting guard rather than the null-returning one.
 *
 * The list itself is read directly here rather than through a Server
 * Action (there isn't a "list everyone" action, and this page is already
 * admin-gated) — built via the shared `PERSON_SELECT`/`toPersonInfo` from
 * src/lib/personInfo.ts, never a hand-spread raw row, so a `passwordHash`
 * column can never ride along even if the select is widened later.
 */
export default async function FamilyPage() {
  const admin = await requireRole("admin");

  const rows = await db.user.findMany({ select: PERSON_SELECT });

  const people: PersonInfo[] = rows.map(toPersonInfo);

  // Active household people (no devices, no deactivated), in the saved order.
  const orderPeople = await db.user.findMany({
    where: HOUSEHOLD_PERSON_WHERE,
    orderBy: HOUSEHOLD_ORDER_BY,
    select: { id: true, displayName: true, avatarColor: true },
  });

  return (
    <div className="py-2">
      <BackLink href="/settings" label="Settings" />

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manage family</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        Add people, reset passwords, and change roles.
      </p>

      <FamilyList people={people} currentUserId={admin.userId} />

      <h2 className="mb-1 mt-8 text-lg font-semibold">Family order</h2>
      <p className="mb-3 text-sm text-muted">
        Drag to set the order people appear in across Marshee, like Whole family.
      </p>
      <FamilyOrderList people={orderPeople} />
    </div>
  );
}
