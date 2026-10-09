import { assistantRoute } from "@/lib/assistant/route";
import { ApiError } from "@/lib/assistant/errors";
import { inventoryCreateBody, inventoryListQuery } from "@/lib/assistant/schemas";
import { requireHouseholdToday } from "@/lib/assistant/today";
import { toInventoryItem } from "@/lib/assistant/serialize";
import { createPantryItem, findDuplicateCandidates } from "@/lib/pantryWrites";
import { searchItems } from "@/lib/match";
import { expiresWithin } from "@/lib/expiring";
import { DEFAULT_LOCATION, HOUSEHOLD_TIME_ZONE, toCategory, toLocation } from "@/lib/constants";
import { formatCalendarDate, parseDateParam, zoneMidnightInstant } from "@/lib/householdDate";
import { onShoppingListIds } from "@/lib/assistant/inventoryReads";
import { db } from "@/lib/db";

export const GET = assistantRoute({
  action: "inventory.list",
  query: inventoryListQuery,
  handler: async ({ query, now }) => {
    const today = requireHouseholdToday(now, query.date);

    const [rows, onList] = await Promise.all([
      db.pantryItem.findMany({
        where: {
          ...(query.location ? { location: query.location } : {}),
          ...(query.category ? { category: query.category } : {}),
        },
        orderBy: { name: "asc" },
      }),
      onShoppingListIds(),
    ]);

    const ctx = (id: string) => ({ onList: onList.has(id), today, timeZone: HOUSEHOLD_TIME_ZONE });
    let items = rows.map((row) => toInventoryItem(row, ctx(row.id)));

    if (query.status === "expiring") {
      items = items.filter((i) => i.expiry !== null && expiresWithin(i.expiry.daysLeft, query.withinDays));
    } else if (query.status) {
      items = items.filter((i) => i.status === query.status);
    }

    if (query.q && query.q.trim()) {
      // Rank order wins over name order while searching.
      items = searchItems(query.q, items);
    }

    return { data: { items, today: formatCalendarDate(today) } };
  },
});

export const POST = assistantRoute({
  action: "inventory.create",
  body: inventoryCreateBody,
  handler: async ({ body, now, changes }) => {
    const location = toLocation(body.location ?? DEFAULT_LOCATION);

    if (!body.allowDuplicate) {
      const matches = await findDuplicateCandidates(body.name, location);
      if (matches.length > 0) {
        throw new ApiError(
          409,
          "conflict",
          "An item with a matching name already exists. Adjust it, or resend with allowDuplicate: true.",
          {
            matches: matches.map((m) => ({
              id: m.item.id,
              name: m.item.name,
              location: m.item.location,
              kind: m.kind,
            })),
          },
        );
      }
    }

    // The browser edit sheet's convention: Denver midnight of the typed day.
    // The schema already rejected impossible dates, so the parse can't be null.
    const expiresOn = body.expiresOn ? parseDateParam(body.expiresOn)! : null;

    const row = await createPantryItem({
      name: body.name,
      quantity: body.quantity,
      unit: body.unit ?? null,
      category: toCategory(body.category),
      location,
      lowThreshold: body.lowThreshold,
      expiresAt: expiresOn ? zoneMidnightInstant(expiresOn, HOUSEHOLD_TIME_ZONE) : null,
    });
    changes.push({ model: "PantryItem", recordId: row.id, action: "create", summary: body });

    const today = requireHouseholdToday(now);
    return {
      status: 201,
      data: { item: toInventoryItem(row, { onList: false, today, timeZone: HOUSEHOLD_TIME_ZONE }) },
    };
  },
});
