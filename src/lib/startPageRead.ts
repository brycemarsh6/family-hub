import "server-only";

import { db } from "@/lib/db";
import { toStartPage } from "@/lib/startPage";

// The only place another login's start page is read. No login check: the
// caller (the Wall tablet settings page) checks who is asking. The tablet's
// start page is the oldest active device login's own; null when there is no
// device login at all.

export async function loadTabletStartPage(): Promise<string | null> {
  const device = await db.user.findFirst({
    where: { role: "device", deactivatedAt: null },
    orderBy: { createdAt: "asc" },
    select: { preferences: { select: { startPage: true } } },
  });
  if (!device) return null;
  return toStartPage(device.preferences?.startPage);
}
