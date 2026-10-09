import { assistantRoute } from "@/lib/assistant/route";
import { ApiError } from "@/lib/assistant/errors";
import { leftoverBody } from "@/lib/assistant/schemas";
import { householdToday } from "@/lib/assistant/today";
import { toInventoryItem } from "@/lib/assistant/serialize";
import { logLeftover } from "@/lib/pantryWrites";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { addCalendarDays, zoneMidnightInstant } from "@/lib/householdDate";

export const POST = assistantRoute({
  action: "leftovers.create",
  body: leftoverBody,
  handler: async ({ body, now, changes }) => {
    const today = householdToday(now, body.date);
    if (!today) {
      throw new ApiError(400, "validation", "`date` must be a real YYYY-MM-DD.");
    }

    const row = await logLeftover({
      name: body.name,
      quantity: body.portions,
      daysGood: body.daysGood,
      location: body.location,
      expiresAt: zoneMidnightInstant(addCalendarDays(today, body.daysGood), HOUSEHOLD_TIME_ZONE),
    });
    changes.push({ model: "PantryItem", recordId: row.id, action: "create", summary: body });

    return {
      status: 201,
      data: { item: toInventoryItem(row, { onList: false, today, timeZone: HOUSEHOLD_TIME_ZONE }) },
    };
  },
});
