import "server-only";

import { db } from "@/lib/db";

// The only place another login's Celebrations switch is read. No login check:
// the caller (the Wall tablet settings page) checks who is asking. The
// tablet's value is the oldest active device login's own; null when there is
// no device login at all. Same shape as startPageRead.ts.

export async function loadTabletCelebrations(): Promise<boolean | null> {
  const device = await db.user.findFirst({
    where: { role: "device", deactivatedAt: null },
    orderBy: { createdAt: "asc" },
    select: { preferences: { select: { celebrations: true } } },
  });
  if (!device) return null;
  return device.preferences?.celebrations ?? true;
}
