import Link from "next/link";
import { CalendarSync, ChevronRight, Images, LogOut, MessageSquare, Tablet, Users } from "lucide-react";
import { AdminPasswordSheet } from "@/components/AdminPasswordSheet";
import { HabitsChoresSettings } from "@/components/HabitsChoresSettings";
import { SettingsAccountCard } from "@/components/SettingsAccountCard";
import { NavModeSetting } from "@/components/NavModeSetting";
import { StartPageSetting } from "@/components/StartPageSetting";
import { TextSizeSetting } from "@/components/TextSizeSetting";
import { VacationCard } from "@/components/VacationCard";
import { WinnieSettings } from "@/components/WinnieSettings";
import { logout } from "@/app/actions/auth";
import { householdToday } from "@/lib/assistant/today";
import { SYNCED_CALENDARS_WORDS } from "@/lib/calendarSyncVocabulary";
import { MANAGER_ROLES } from "@/lib/constants";
import { requireVerifiedUser } from "@/lib/dal";
import { countNewFeedback } from "@/lib/feedbackRead";
import { loadVacations } from "@/lib/habitsRead";
import { TWO_COLUMN_CLASSES } from "@/lib/gridClasses";
import { formatCalendarDate } from "@/lib/householdDate";
import { countSlideshowPhotos } from "@/lib/slideshowRead";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * App-wide settings: your account card first (taps through to /profile),
 * "Menu style" for everyone (devices too), "Text size", "Open Marshee on"
 * (accounts only: the tablet sets its own on the Wall tablet page), the
 * admin-only doors "Manage family" and "Feedback", the parent and admin doors "Synced calendars"
 * and "Slideshow photos", the "Wall tablet" door (parents, admins and the tablet itself), and last the "Habits & Chores" section
 * and the Vacation mode card (accounts only: a device login never sees them), then
 * Sign out last. Your own name, colour and
 * password live on /profile.
 *
 * Wide (a 48rem container, decision 283): two columns. Left: account card,
 * Menu style, Text size, Open Marshee on, Manage family, Synced calendars, Slideshow photos, Wall tablet, Feedback, Sign out. Right:
 * Habits & Chores, Vacation, Winnie. A phone keeps one column in this order:
 * 1 account card, 2 Menu style, Text size, Open Marshee on, 3 Manage family, Synced calendars, then Slideshow photos and Wall tablet (they
 * share order-3, so source order decides), 4 Feedback, 5 Habits & Chores, 6 Vacation,
 * 7 Winnie, 8 Sign out. The column divs dissolve (`contents`) below 48rem and
 * each section's `order-N` sets that order. The two sheets inside (Menu style,
 * the tablet's Sign out) portal to the body, so the container holds none.
 */
export default async function SettingsPage() {
  const user = await requireVerifiedUser();
  const today = householdToday(new Date())!;
  const vacations = user.isDevice ? [] : await loadVacations(user.userId, today);
  const canSyncCalendars = !user.isDevice && MANAGER_ROLES.includes(user.role);
  // Same people as the calendar link: parents and admins on a real login.
  const canManageSlideshow = canSyncCalendars;
  const slideshowCount = canManageSlideshow ? await countSlideshowPhotos() : 0;
  const newFeedback = user.role === "admin" ? await countNewFeedback() : 0;

  return (
    <div className="py-2" data-page-width="wide">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>

      <div className="@container">
        <div className={TWO_COLUMN_CLASSES}>
          {/* Both columns start level on wide: the first section keeps a 16px gap under the title. */}
          <div className="@max-[48rem]:contents @min-[48rem]:[&>:first-child>*]:mt-4">
            <div className="order-1">
              <SettingsAccountCard
                displayName={user.displayName}
                avatarColor={user.avatarColor}
                role={user.role}
                isDevice={user.isDevice}
              />
            </div>

            <div className="order-2">
              <NavModeSetting navMode={user.navMode} />
              <TextSizeSetting textSize={user.textSize} />
              {!user.isDevice && <StartPageSetting startPage={user.startPage} forTablet={false} />}
            </div>

            {user.role === "admin" && (
              <div className="order-3">
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
              </div>
            )}

            {canSyncCalendars && (
              <div className="order-3">
                <Link
                  href="/settings/calendars"
                  className="mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
                >
                  <span className="flex items-center gap-3">
                    <CalendarSync aria-hidden="true" size={22} className="shrink-0 text-muted" />
                    {SYNCED_CALENDARS_WORDS.rowLabel}
                  </span>
                  <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
                </Link>
              </div>
            )}

            {canManageSlideshow && (
              <div className="order-3">
                <Link
                  href="/settings/slideshow"
                  className="mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
                >
                  <span className="flex items-center gap-3">
                    <Images aria-hidden="true" size={22} className="shrink-0 text-muted" />
                    Slideshow photos
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-muted">{slideshowCount}</span>
                    <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
                  </span>
                </Link>
              </div>
            )}

            {(canManageSlideshow || user.isDevice) && (
              <div className="order-3">
                <Link
                  href="/settings/wall-tablet"
                  className="mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
                >
                  <span className="flex items-center gap-3">
                    <Tablet aria-hidden="true" size={22} className="shrink-0 text-muted" />
                    Wall tablet
                  </span>
                  <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
                </Link>
              </div>
            )}

            {user.role === "admin" && (
              <div className="order-4">
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
              </div>
            )}

            {/* A plain form pointed at the Server Action, same as the old drawer
                row: no client JavaScript required, the browser just submits it. */}
            <div className="order-8">
              {user.isDevice ? (
                // The tablet can't sign itself out with one tap: this asks for an
                // admin's password first (mission 39, C4).
                <AdminPasswordSheet />
              ) : (
                <form action={logout} className="mt-6">
                  <button
                    type="submit"
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
                  >
                    <LogOut aria-hidden="true" size={22} className="shrink-0 text-muted" />
                    Sign out
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="@max-[48rem]:contents @min-[48rem]:[&>:first-child>*]:mt-4">
            {!user.isDevice && (
              <>
                <div className="order-5">
                  <HabitsChoresSettings showStreaks={user.showStreaks} isAdmin={user.role === "admin"} />
                </div>
                <div className="order-6">
                  <VacationCard vacations={vacations} today={formatCalendarDate(today)} />
                </div>
              </>
            )}

            {user.role === "admin" && (
              <div className="order-7">
                <WinnieSettings />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
