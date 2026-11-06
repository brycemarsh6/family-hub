import Link from "next/link";
import { ChevronRight, LogOut, MessageSquare, Users } from "lucide-react";
import { HabitsChoresSettings } from "@/components/HabitsChoresSettings";
import { SettingsAccountCard } from "@/components/SettingsAccountCard";
import { NavModeSetting } from "@/components/NavModeSetting";
import { VacationCard } from "@/components/VacationCard";
import { logout } from "@/app/actions/auth";
import { householdToday } from "@/lib/assistant/today";
import { requireVerifiedUser } from "@/lib/dal";
import { countNewFeedback } from "@/lib/feedbackRead";
import { loadVacations } from "@/lib/habitsRead";
import { formatCalendarDate } from "@/lib/householdDate";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * App-wide settings: your account card first (taps through to /profile),
 * "Menu style" for everyone (devices too), the
 * admin-only doors "Manage family" and "Feedback", and last the "Habits & Chores" section
 * and the Vacation mode card (accounts only: a device login never sees them), then
 * Sign out last. Your own name, colour and
 * password live on /profile.
 */
export default async function SettingsPage() {
  const user = await requireVerifiedUser();
  const today = householdToday(new Date())!;
  const vacations = user.isDevice ? [] : await loadVacations(user.userId, today);
  const newFeedback = user.role === "admin" ? await countNewFeedback() : 0;

  return (
    <div className="py-2">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>

      <SettingsAccountCard
        displayName={user.displayName}
        avatarColor={user.avatarColor}
        role={user.role}
        isDevice={user.isDevice}
      />

      <NavModeSetting navMode={user.navMode} />

      {user.role === "admin" && (
        <Link
          href="/settings/family"
          className="mt-6 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
        >
          <span className="flex items-center gap-3">
            <Users aria-hidden="true" size={22} className="shrink-0 text-muted" />
            Manage family
          </span>
          <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
        </Link>
      )}

      {user.role === "admin" && (
        <Link
          href="/settings/feedback"
          className="mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
        >
          <span className="flex items-center gap-3">
            <MessageSquare aria-hidden="true" size={22} className="shrink-0 text-muted" />
            Feedback
          </span>
          <span className="flex items-center gap-2">
            {newFeedback > 0 && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-fg">
                {newFeedback} new
              </span>
            )}
            <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
          </span>
        </Link>
      )}

      {!user.isDevice && (
        <>
          <HabitsChoresSettings showStreaks={user.showStreaks} isAdmin={user.role === "admin"} />
          <VacationCard vacations={vacations} today={formatCalendarDate(today)} />
        </>
      )}

      {/* A plain form pointed at the Server Action, same as the old drawer
          row: no client JavaScript required, the browser just submits it. */}
      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
        >
          <LogOut aria-hidden="true" size={22} className="shrink-0 text-muted" />
          Sign out
        </button>
      </form>
    </div>
  );
}
