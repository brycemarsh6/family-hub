import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { HabitsChoresSettings } from "@/components/HabitsChoresSettings";
import { NavModeSetting } from "@/components/NavModeSetting";
import { requireVerifiedUser } from "@/lib/dal";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * App-wide settings: "Menu style" for everyone (devices too), the
 * "Habits & Chores" section (accounts only: a device login never sees it),
 * and the admin-only door "Manage family" below it. Your own name, colour and
 * password live on /profile.
 */
export default async function SettingsPage() {
  const user = await requireVerifiedUser();

  return (
    <div className="py-2">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>

      <NavModeSetting navMode={user.navMode} />

      {!user.isDevice && (
        <HabitsChoresSettings showStreaks={user.showStreaks} isAdmin={user.role === "admin"} />
      )}

      {user.role === "admin" && (
        <Link
          href="/settings/family"
          className="mt-4 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-base font-medium transition-colors active:bg-surface-2"
        >
          <span className="flex items-center gap-3">
            <Users aria-hidden="true" size={22} className="shrink-0 text-muted" />
            Manage family
          </span>
          <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
        </Link>
      )}
    </div>
  );
}
