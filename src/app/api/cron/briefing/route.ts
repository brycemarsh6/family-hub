import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { calendarDateInZone } from "@/lib/householdDate";
import { loadHouseholdAdults, loadHouseholdPeople } from "@/lib/householdPeople";
import { BRIEFING_EVENT_TYPE, buildBriefingMessage, briefingTitle, isBriefingHour } from "@/lib/briefing";
import { loadBriefingInput, loadBriefingShared } from "@/lib/briefingRead";
import { claimBriefing, finishBriefing, releaseBriefing } from "@/lib/briefingSent";
import { buildWinnieEvent } from "@/lib/winnieEvents";
import { sendWinnieEvent } from "@/lib/winnieNotify";

// Winnie's morning briefing (mission 48). Vercel's cron calls this twice a day
// (15:00 and 16:00 UTC); only the run that lands in the 9 o'clock hour in
// Denver sends, so the other one is a no-op all year. Its own gate is the
// CRON_SECRET bearer check, run before anything else. The answer carries
// counts only: no names, message text, URL, key or secret, here or in logs.

export const dynamic = "force-dynamic";

/** True only for `Authorization: Bearer <CRON_SECRET>`. Constant-time; a missing secret never matches. */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("authorization");
  if (!provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  if (!isBriefingHour(now)) return Response.json({ sent: 0, skipped: "outside-hour" });

  const today = calendarDateInZone(now, HOUSEHOLD_TIME_ZONE);
  const [adults, household] = await Promise.all([loadHouseholdAdults(), loadHouseholdPeople()]);
  const shared = await loadBriefingShared(today);

  const counts = { sent: 0, alreadySent: 0, failed: 0, notConfigured: 0 };
  for (const adult of adults) {
    const eventId = crypto.randomUUID();
    let claimed = false;
    try {
      // The unique claim comes before the send: a second run the same day stops here.
      if (!(await claimBriefing(adult.id, today, eventId))) {
        counts.alreadySent += 1;
        continue;
      }
      claimed = true;
      const input = await loadBriefingInput(adult, today, household, shared);
      const event = buildWinnieEvent(
        {
          type: BRIEFING_EVENT_TYPE,
          title: briefingTitle(today),
          body: buildBriefingMessage(input),
          intendedRecipient: adult.displayName,
        },
        now,
        eventId,
      );
      const result = await sendWinnieEvent(event);
      if (result.ok) {
        await finishBriefing(adult.id, today, "accepted");
        counts.sent += 1;
      } else if (result.reason === "not-configured") {
        // H10: nothing was tried, so leave no row and let the other run try.
        await releaseBriefing(adult.id, today);
        counts.notConfigured += 1;
      } else {
        await finishBriefing(adult.id, today, result.reason);
        counts.failed += 1;
      }
    } catch {
      // Deliberately drops the error: it could quote a name or the message.
      counts.failed += 1;
      console.info(`briefing failed eventId=${eventId}`);
      if (claimed) {
        try {
          await finishBriefing(adult.id, today, "unreachable");
        } catch {
          // The row stays "sending"; still no second send today.
        }
      }
    }
  }
  console.info(`briefing sent=${counts.sent} alreadySent=${counts.alreadySent} failed=${counts.failed} notConfigured=${counts.notConfigured}`);
  return Response.json(counts);
}
