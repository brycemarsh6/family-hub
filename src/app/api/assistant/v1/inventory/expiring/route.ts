import { assistantRoute } from "@/lib/assistant/route";
import { ApiError } from "@/lib/assistant/errors";
import { expiringQuery } from "@/lib/assistant/schemas";
import { householdToday } from "@/lib/assistant/today";
import { toInventoryItem } from "@/lib/assistant/serialize";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { formatCalendarDate } from "@/lib/householdDate";
import { onShoppingListIds } from "@/lib/assistant/inventoryReads";
import { db } from "@/lib/db";

export const GET = assistantRoute({
  action: "inventory.expiring",
  query: expiringQuery,
  handler: async ({ query, now }) => {
    const today = householdToday(now, query.date);
    if (!today) {
      throw new ApiError(400, "validation", "`date` must be a real YYYY-MM-DD.");
    }

    const [rows, onList] = await Promise.all([
      db.pantryItem.findMany(),
      onShoppingListIds(),
    ]);

    const items = rows
      .map((row) =>
        toInventoryItem(row, { onList: onList.has(row.id), today, timeZone: HOUSEHOLD_TIME_ZONE }),
      )
      .filter((i) => i.expiry !== null && i.expiry.daysLeft <= query.withinDays)
      .map((i) => ({
        ...i,
        urgency:
          i.expiry!.daysLeft <= 1 ? ("now" as const) : i.expiry!.daysLeft <= 6 ? ("week" as const) : ("later" as const),
      }))
      .sort((a, b) => a.expiry!.daysLeft - b.expiry!.daysLeft || a.name.localeCompare(b.name));

    return { data: { items, today: formatCalendarDate(today) } };
  },
});
