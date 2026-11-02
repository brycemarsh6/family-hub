import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { requireVerifiedUser } from "@/lib/dal";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * App-wide settings. Today that is one admin-only door, "Manage family";
 * everyone else sees a placeholder. Your own name, colour and password
 * live on /profile.
 */
export default async function SettingsPage() {
  const user = await requireVerifiedUser();

  return (
    <div className="py-2">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>

      {user.role === "admin" ? (
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
      ) : (
        <p className="mt-2 text-sm text-muted">Nothing to set up yet.</p>
      )}
    </div>
  );
}
