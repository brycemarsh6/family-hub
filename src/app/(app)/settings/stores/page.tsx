import { BackLink } from "@/components/BackLink";
import { StoreListEditor } from "@/components/StoreListEditor";
import { MANAGER_ROLES } from "@/lib/constants";
import { NARROW_PAGE_CLASSES } from "@/lib/gridClasses";
import { requireRole } from "@/lib/dal";
import { householdStores } from "@/lib/householdSettingsRead";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * Parents and admins: the stores on the shopping list, in the order they are
 * offered. `requireRole` bounces a kid or the tablet to `/`, and the write
 * actions check the login again. The editor owns the list and the count line
 * so they stay right as stores come and go.
 */
export default async function StoresPage() {
  await requireRole(...MANAGER_ROLES);
  const stores = await householdStores();

  return (
    <div className="py-2" data-page-width="wide">
      <div className={NARROW_PAGE_CLASSES}>
        <BackLink href="/settings" label="Settings" />

        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Stores</h1>
        <p className="mt-1 text-sm text-muted">
          The stores on your shopping list, in this order. Tap a store to rename it.
        </p>

        <StoreListEditor initialStores={stores} />
      </div>
    </div>
  );
}
