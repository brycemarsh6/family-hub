"use client";

import { LinkedAccountCard } from "@/components/LinkedAccountCard";
import { EmptyState } from "@/components/EmptyState";
import { startGoogleLink } from "@/app/actions/linkedCalendars";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import { SYNCED_CALENDARS_EXTRA_WORDS, SYNCED_CALENDARS_WORDS } from "@/lib/calendarSyncVocabulary";
import type { SyncedAccountRow } from "@/lib/linkedCalendarsRead";

/**
 * The Synced calendars page body: one card per linked account, then the
 * "Link a Google account" button. Linking is a full-page trip to Google, so
 * the button waits for the server's URL and then leaves; it isn't optimistic.
 * When Google sync isn't set up on the server, the button is replaced by a
 * plain line saying so.
 */
export function SyncedCalendarsList({
  accounts,
  viewerId,
  configured,
}: {
  accounts: SyncedAccountRow[];
  viewerId: string;
  configured: boolean;
}) {
  const link = useOptimisticRun<never>(() => {});

  function startLink() {
    link.run(null, async () => {
      const result = await startGoogleLink();
      if ("error" in result) return result;
      window.location.href = result.url;
      return {};
    });
  }

  return (
    <div className="mt-4">
      {accounts.length === 0 ? (
        <EmptyState
          emoji="📅"
          title={SYNCED_CALENDARS_EXTRA_WORDS.emptyTitle}
          hint={SYNCED_CALENDARS_EXTRA_WORDS.emptyHint}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <LinkedAccountCard key={account.id} account={account} viewerId={viewerId} />
          ))}
        </div>
      )}

      {configured ? (
        <button
          type="button"
          onClick={startLink}
          disabled={link.pending}
          className="mt-4 min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {SYNCED_CALENDARS_WORDS.linkButton}
        </button>
      ) : (
        <p className="mt-4 text-sm text-muted">{SYNCED_CALENDARS_WORDS.notConfigured}</p>
      )}
      {configured && (
        <p className="mt-2 text-sm text-muted">{SYNCED_CALENDARS_EXTRA_WORDS.unverifiedHint}</p>
      )}
      {link.error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {link.error}
        </p>
      )}

      {accounts.length > 0 && (
        <p className="mt-3 text-sm text-muted">{SYNCED_CALENDARS_EXTRA_WORDS.syncHowItWorks}</p>
      )}
      <p className="mt-3 text-sm text-muted">{SYNCED_CALENDARS_EXTRA_WORDS.ownerOnlyNote}</p>
    </div>
  );
}
