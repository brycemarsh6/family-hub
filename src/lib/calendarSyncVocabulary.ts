// Calendar sync's one vocabulary (mission 55): what a linked Google calendar
// can do, the states of a linked account, and the words on the Synced
// calendars page. No imports, so it is safe in a Server Action, a pure test
// and a client component. No Prisma enums: the database stores these as plain
// strings and `toSyncDirection` repairs anything unexpected.

export const SYNC_DIRECTIONS = ["off", "outbound", "twoWay"] as const;
export type SyncDirection = (typeof SYNC_DIRECTIONS)[number];

export const SYNC_DIRECTION_LABELS: Record<SyncDirection, string> = {
  off: "Not synced",
  outbound: "Marshee to Google only",
  twoWay: "Both ways",
};

export const SYNC_DIRECTION_HINTS: Record<SyncDirection, string> = {
  off: "Marshee and this calendar stay separate.",
  outbound: "Events you choose to sync are copied to this calendar.",
  twoWay: "Changes in either place show up in the other.",
};

export function isSyncDirection(raw: unknown): raw is SyncDirection {
  return SYNC_DIRECTIONS.some((direction) => direction === raw);
}

/** Anything unknown is "off", the safe choice that sends nothing anywhere. */
export function toSyncDirection(raw: unknown): SyncDirection {
  return isSyncDirection(raw) ? raw : "off";
}

export const ACCOUNT_STATUSES = ["ok", "needs-relink"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** Anything unknown is "ok", the state that asks nothing of the person. */
export function toAccountStatus(raw: unknown): AccountStatus {
  return ACCOUNT_STATUSES.some((status) => status === raw) ? (raw as AccountStatus) : "ok";
}

export const SYNCED_CALENDARS_WORDS = {
  pageTitle: "Synced calendars",
  rowLabel: "Synced calendars",
  linkButton: "Link a Google account",
  unlinkButton: "Unlink this account",
  notConfigured: "Google sync isn't set up on this server yet",
  notYours: (name: string) => `Only ${name} can change this account`,
} as const;

export const SYNCED_CALENDARS_EXTRA_WORDS = {
  linkedOk: "Google account linked.",
  renameButton: "Rename",
  renameHeading: "Rename account",
  renameSave: "Save",
  emptyTitle: "No calendars linked yet",
  emptyHint: "Link a Google account to bring its calendars in.",
  syncNotOn: "Syncing isn't on yet. Your choices are saved for when it starts.",
  ownerOnlyNote: "You can only change or unlink accounts you linked.",
  directionSheetTitle: "Sync direction",
} as const;

/** "Linked by Bryce", or "Work, linked by Bryce" when the account has a label. */
export function linkedByLine(linkerName: string, label: string | null): string {
  return label ? `${label}, linked by ${linkerName}` : `Linked by ${linkerName}`;
}

/** The collapsed card summary: "2 calendars, 1 set to sync". */
export function calendarsSummary(count: number, setToSync: number): string {
  if (count === 0) return "No calendars";
  const total = `${count} ${count === 1 ? "calendar" : "calendars"}`;
  return setToSync > 0 ? `${total}, ${setToSync} set to sync` : total;
}

const LINK_ERROR_MESSAGES: Record<string, string> = {
  state: "That link expired. Try again.",
  signin: "Sign in to Marshee first, then link.",
  access_denied: "Google didn't allow it. Try again.",
  admin_policy_enforced:
    "Your work's Google admin has blocked Marshee. Ask them to allow it, or link a personal account.",
  exchange: "Google didn't finish the link. Try again.",
  "no-refresh-token": "Google didn't give Marshee lasting access. Try again.",
  calendars:
    "Google didn't share this account's calendars. Unlink it if it shows here, then try again and leave every box ticked.",
  google: "Something went wrong linking Google. Try again.",
};

// The only shape of ?error= the callback copies into a redirect and the page
// shows. Anything else is treated as the generic "google".
const LINK_ERROR_SHAPE = /^[a-z_-]{1,40}$/;

/** A safe `?error=` code: the value itself if it has the strict shape, else "google". */
export function toLinkErrorCode(raw: unknown): string {
  return typeof raw === "string" && LINK_ERROR_SHAPE.test(raw) ? raw : "google";
}

/** The page's line for an `?error=` code from the callback route. */
export function linkErrorMessage(code: string): string {
  return (
    Object.hasOwn(LINK_ERROR_MESSAGES, code)
      ? LINK_ERROR_MESSAGES[code]
      : `Google returned an error (${code}). Try again.`
  );
}
