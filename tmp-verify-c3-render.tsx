// Throwaway verification script (mission-10/C3) — renders the actual
// EventCard and MonthCell components with react-dom/server against fixed
// sample props, and prints the resulting inline `style` attribute for the
// background. Run once BEFORE the hexToRgba hoist (via `git stash`) and
// once AFTER, and diff the two outputs — this exercises the real component
// render path (not just the isolated function), the closest thing to
// getComputedStyle available without a real browser in this environment.
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { EventCard } from "./src/components/EventCard";
import { MonthCell } from "./src/components/MonthCell";
import type { CalendarEventView } from "./src/lib/types";

const today = new Date(2026, 8, 2); // Sep 2, 2026 — matches real "today"
const day = new Date(2026, 8, 2);

const event: CalendarEventView = {
  id: "evt-1",
  title: "Temple",
  notes: null,
  location: "Downtown",
  allDay: false,
  startAt: new Date(2026, 8, 2, 13, 0),
  endAt: new Date(2026, 8, 2, 14, 0),
  people: [
    { userId: "u1", displayName: "Bryce", avatarColor: "blue" },
    { userId: "u2", displayName: "Emily", avatarColor: "green" },
  ],
  createdByName: "Bryce",
};

function extractBackgroundStyle(html: string): string[] {
  const matches = [...html.matchAll(/style="([^"]*background[^"]*)"/g)];
  return matches.map((m) => m[1]);
}

const cardHtml = renderToStaticMarkup(
  React.createElement(EventCard, {
    event,
    day,
    today,
    showLocation: true,
    compact: false,
    onOpen: () => {},
  }),
);
console.log("EVENTCARD_STYLE:" + JSON.stringify(extractBackgroundStyle(cardHtml)));

const cellHtml = renderToStaticMarkup(
  React.createElement(MonthCell, {
    day,
    today,
    isCurrentMonth: true,
    isToday: true,
    notLoaded: false,
    slots: [
      { event, showLabel: true, roundLeft: true, roundRight: true },
      null,
      null,
    ],
    overflow: 0,
    onOpen: () => {},
  }),
);
console.log("MONTHCELL_STYLE:" + JSON.stringify(extractBackgroundStyle(cellHtml)));
