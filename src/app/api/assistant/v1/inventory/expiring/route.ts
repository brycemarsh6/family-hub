import { assistantRoute } from "@/lib/assistant/route";
import { expiringQuery } from "@/lib/assistant/schemas";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { toInventoryItem } from "@/lib/assistant/serialize";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { expiresWithin, urgencyFor } from "@/lib/expiring";
import { formatCalendarDate } from "@/lib/householdDate";
import { onShoppingListIds } from "@/lib/assistant/inventoryReads";
import { db } from "@/lib/db";

export const GET = assistantRoute({
  action: "inventory.expiring",
  query: expiringQuery,
  handler: async ({ query, now }) => {
    const today = requireHouseholdToday(now, query.date);

    const [rows, onList] = await Promise.all([
      db.pantryItem.findMany(),
      onShoppingListIds(),
    ]);

    const items = rows
      .map((row) =>
        toInventoryItem(row, { onList: onList.has(row.id), today, timeZone: HOUSEHOLD_TIME_ZONE }),
      )
      .filter((i) => i.expiry !== null && expiresWithin(i.expiry.daysLeft, query.withinDays))
      .map((i) => ({ ...i, urgency: urgencyFor(i.expiry!.daysLeft) }))
      .sort((a, b) => a.expiry!.daysLeft - b.expiry!.daysLeft || a.name.localeCompare(b.name));

    return { data: { items, today: formatCalendarDate(today) } };
  },
});
