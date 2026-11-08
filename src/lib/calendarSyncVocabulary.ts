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
  outbound: "Events you add in Marshee are copied to this calendar.",
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

export const SYNCED_CALENDARS_WORDS = {
  pageTitle: "Synced calendars",
  rowLabel: "Synced calendars",
  linkButton: "Link a Google account",
  unlinkButton: "Unlink this account",
  notConfigured: "Google sync isn't set up on this server yet",
  notYours: (name: string) => `Only ${name} can change this account`,
} as const;
