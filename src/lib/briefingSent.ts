import "server-only";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { utcMidnightInstant, type CalendarDate } from "@/lib/householdDate";

// The once-a-day guard for Winnie's morning briefing (mission 48). The cron
// route claims a person's day BEFORE it sends: the unique (userId, day) pair
// makes a second claim the same day fail, so nobody gets two. No auth: only the
// CRON_SECRET-protected route calls this.

/** How a claimed briefing ended. "sending" is the claim itself. */
export type BriefingStatus = "sending" | "accepted" | "rejected" | "unreachable";

/** Claims `day` for `userId`. False when it was already claimed (a unique clash), true when this call won it. */
export async function claimBriefing(userId: string, day: CalendarDate, eventId: string): Promise<boolean> {
  try {
    await db.winnieBriefingSent.create({
      data: { userId, day: utcMidnightInstant(day), eventId, status: "sending" satisfies BriefingStatus },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
    throw error;
  }
}

/** Records how the send ended. */
export async function finishBriefing(userId: string, day: CalendarDate, status: Exclude<BriefingStatus, "sending">): Promise<void> {
  await db.winnieBriefingSent.update({
    where: { userId_day: { userId, day: utcMidnightInstant(day) } },
    data: { status },
  });
}

/** Deletes the claim, so a later run the same hour may try again (used only when Winnie is not configured, H10). */
export async function releaseBriefing(userId: string, day: CalendarDate): Promise<void> {
  await db.winnieBriefingSent.deleteMany({ where: { userId, day: utcMidnightInstant(day) } });
}
