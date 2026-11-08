import { BackLink } from "@/components/BackLink";
import { SyncedCalendarsList } from "@/components/SyncedCalendarsList";
import { requireRole } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { SYNCED_CALENDARS_EXTRA_WORDS, SYNCED_CALENDARS_WORDS, linkErrorMessage, toLinkErrorCode } from "@/lib/calendarSyncVocabulary";
import { isGoogleConfigured } from "@/lib/google/oauth";
import { loadSyncedCalendarsPage } from "@/lib/linkedCalendarsRead";
import { isTokenKeyConfigured } from "@/lib/tokenCrypto";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * Parents and admins: the Google accounts the family has linked and which way
 * each calendar syncs. `requireRole` bounces anyone else (and the tablet) to
 * `/`. `?linked=` and `?error=` come back from the Google callback route.
 */
export default async function SyncedCalendarsPage({
  searchParams,
}: {
  searchParams: Promise<{ linked?: string; error?: string }>;
}) {
  const user = await requireRole(...MANAGER_ROLES);
  const { linked, error } = await searchParams;
  const accounts = await loadSyncedCalendarsPage();
  const configured = isGoogleConfigured() && isTokenKeyConfigured();

  return (
    <div className="py-2">
      <BackLink href="/settings" label="Settings" />

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{SYNCED_CALENDARS_WORDS.pageTitle}</h1>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-warn">
          {linkErrorMessage(toLinkErrorCode(error))}
        </p>
      ) : linked ? (
        <p role="status" className="mt-3 text-sm text-muted">
          {SYNCED_CALENDARS_EXTRA_WORDS.linkedOk}
        </p>
      ) : null}

      <SyncedCalendarsList accounts={accounts} viewerId={user.userId} configured={configured} />
    </div>
  );
}
