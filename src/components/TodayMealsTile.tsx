"use client";

import { BookOpen } from "lucide-react";
import DashboardTile from "./DashboardTile";
import { useToday } from "@/lib/useToday";
import { todaysMeals } from "@/lib/dashboard";
import type { TodaySlot } from "@/lib/dashboard";
import { MEAL_SLOTS } from "@/lib/constants";
import type { MealPlanView } from "@/lib/types";

/**
 * The dashboard's "Today's meals" tile — the only daily-changing one, and
 * the only tile on the page that calls useToday(). Everything else on the
 * dashboard is safe to compute entirely on the server; "which of this
 * week's meal plans is today's" is not, because Vercel's runtime clock
 * runs UTC while this household runs Mountain (see useToday.ts's own
 * comment) — deciding it on the server would show the wrong day's meals
 * for several hours every evening.
 *
 * `plans` is the server's raw MealPlanView[] fetch (±8 days around the
 * server's own clock — wide enough to always contain the browser's real
 * current week, however the two clocks disagree). This component is the
 * only place that turns that list into "today's four slots", via the pure
 * todaysMeals() so the logic itself stays unit-tested.
 *
 * Hydration safety is the whole reason this file exists rather than just
 * being inline JSX on the page: useToday() returns null during the server
 * render AND the first client render (they have to match, or React logs a
 * hydration-mismatch warning), then flips to the real day moments later.
 * The four slot LABELS (Breakfast/Lunch/Dinner/Snacks) don't depend on the
 * clock at all, so they render immediately in every state — it's only the
 * per-slot VALUE that has to wait, and it waits behind a plain
 * aria-hidden placeholder rather than a guess, so nothing has to flash and
 * then flip once the real day is known.
 */
// A day with no plan at all renders exactly like a planned-but-unfilled
// day: four slots, each showing "—".
const EMPTY_DAY: TodaySlot[] = MEAL_SLOTS.map((slot) => ({
  slot,
  title: null,
  recipeId: null,
}));

export default function TodayMealsTile({
  href,
  icon,
  title,
  plans,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  plans: MealPlanView[];
}) {
  const today = useToday();
  const slots = today === null ? null : todaysMeals(plans, today);

  return (
    <DashboardTile href={href} icon={icon} title={title} wide>
      {/*
        Always four rows — loading, empty, and filled alike. That's what
        keeps the tile from shifting the page as `today` resolves, and it's
        also the more useful shape: the four slot names are themselves
        information ("nothing for dinner yet" is the thing you want to see),
        where a collapsed one-line empty state left this tile as ~150px of
        blank space on the busiest screen in the app.
      */}
      <div className="flex flex-col gap-1.5">
        {today === null ? (
          // SSR and the first client render both land here (see the file
          // comment above) — labels shown normally, values as inert
          // placeholders. No "Nothing planned today" text yet: that's a
          // real claim about the data, and we don't know it's true until
          // `today` resolves a moment later.
          MEAL_SLOTS.map((slot) => (
            // h-5 matches a resolved row exactly: a 16px placeholder shifted
            // the three tiles below down 16px the moment `today` resolved,
            // on every single page view.
            <div key={slot} className="flex h-5 items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
                {slot}
              </span>
              <span aria-hidden="true" className="h-5 w-28 rounded bg-surface-2" />
            </div>
          ))
        ) : (
          // `slots === null` means no plan covers this week at all; an
          // all-empty day looks identical, and deliberately so — from a
          // tile, "no plan exists" and "nothing filled in yet" are the same
          // actionable fact, and tapping through goes to the same place.
          (slots ?? EMPTY_DAY).map((slot) => (
            <div key={slot.slot} className="flex h-5 items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
                {slot.slot}
              </span>
              <span
                className={`flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm ${
                  slot.title ? "font-medium text-fg" : "text-muted"
                }`}
              >
                {/* A book icon marks a slot filled from the recipe box
                    rather than free text — same treatment as WeekCard's
                    own slot rows on the real Meal Plan page. */}
                {slot.recipeId && (
                  <BookOpen aria-hidden="true" size={13} className="shrink-0 text-accent" />
                )}
                <span className="truncate">{slot.title ?? "—"}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </DashboardTile>
  );
}
