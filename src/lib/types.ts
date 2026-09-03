// Plain shapes for the data we hand from the server to the browser.
//
// We define these by hand rather than reusing Prisma's own types so that the
// browser-side code never imports anything from the database layer. It keeps
// the JavaScript sent to the phone small, and makes it obvious exactly which
// fields each screen actually needs.

export type GroceryItemView = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string;
  checked: boolean;
  note: string | null;
  pantryItemId: string | null;
  /** Where this'll be bought. Null until the shopper chooses one. */
  store: string | null;
  /**
   * An explicit "put it here" override for Put away. Null means no
   * opinion: a linked item stays wherever it's currently stored (read
   * live at put-away time, not frozen here), and a brand-new item lands
   * in DEFAULT_LOCATION. See the Put-away review plan in CLAUDE.md.
   */
  location: string | null;
  /** Set only by a deliberate category edit in the sheet — see
   * editGroceryItem's own comment for why this can't be inferred from a
   * mismatch. */
  categoryEdited: boolean;
  /** The linked pantry item's CURRENT location, for display only — "this
   * is where it lives right now." Null for an item with no pantry link,
   * or if the link is somehow dangling. Not the same thing as `location`
   * above, which is this grocery row's own override. */
  pantryItemLocation: string | null;
};

export type PantryItemView = {
  id: string;
  name: string;
  location: string;
  quantity: number;
  unit: string | null;
  category: string;
  lowThreshold: number;
  /** True when this item already has an unchecked entry on the grocery list. */
  onList: boolean;
  /**
   * A real expiry date someone read off the packet and typed in. Wins over
   * any estimate the Expiring page would otherwise guess — see
   * src/lib/shelfLife.ts for the estimate side of this.
   */
  expiresAt: Date | null;
};

export type MealPlanEntryView = {
  id: string;
  /** 0 = the plan's own Sunday, ... 6 = the following Saturday. */
  dayOffset: number;
  slot: string;
  title: string;
  /** Soft link only — see the schema comment on MealPlanEntry.recipeId. */
  recipeId: string | null;
};

export type MealPlanView = {
  id: string;
  weekStart: Date;
  entries: MealPlanEntryView[];
};

/** One person on a calendar event, as the browser needs it — a User row
 * narrowed to exactly what a calendar card shows (see personInfo.ts's own
 * reasoning for why this project always narrows a User row by hand rather
 * than passing one through wholesale). Lives here, not in CalendarViews.tsx,
 * because DaySection.tsx and EventCard.tsx also need it — a component
 * importing a type from another component is exactly the cycle STRUCTURE.md
 * forbids (see mission-8's Captain B2 finding). */
export type CalendarPersonView = {
  userId: string;
  displayName: string;
  avatarColor: string;
};

/** One CalendarEvent, as the browser needs it. Same cycle-avoidance reason
 * as CalendarPersonView above: CalendarViews.tsx, DaySection.tsx, and
 * EventCard.tsx all import this from here rather than from one another. */
export type CalendarEventView = {
  id: string;
  title: string;
  notes: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  people: CalendarPersonView[];
  /**
   * The creator's display name, for the detail sheet's "Added by" line.
   * Null when the creator was deactivated (SetNull) or the event predates
   * this field. Was a separate `Record<eventId, name>` map threaded
   * alongside `events` (page.tsx built it, CalendarViews.tsx looked it up
   * by id) until mission-9's Captain finding (K2/C2a): a per-event field is
   * simpler to thread through a view switch than a same-length sibling map
   * that has to be kept in sync by id, and every other CalendarEventView
   * consumer that doesn't care about it just ignores the field.
   */
  createdByName: string | null;
};
