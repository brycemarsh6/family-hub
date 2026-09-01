import { redirect } from "next/navigation";
import { requireVerifiedUser } from "@/lib/dal";
import { BackLink } from "@/components/BackLink";
import { SettingsForm } from "@/components/SettingsForm";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * Everyone's own settings — display name, avatar colour, password. Any
 * signed-in ACCOUNT reaches this page; a `device` session (the wall
 * tablet, once P4 exists) is bounced home rather than shown a page whose
 * every action refuses it anyway (account.ts's DEVICE_REFUSED_ERROR) — see
 * mission-6's C3 contract.
 */
export default async function SettingsPage() {
  const user = await requireVerifiedUser();
  if (user.isDevice) redirect("/");

  return (
    <div className="py-2">
      <BackLink href="/" label="Home" />

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        Your name, avatar colour, and password.
      </p>

      <SettingsForm
        displayName={user.displayName}
        avatarColor={user.avatarColor}
        role={user.role}
      />
    </div>
  );
}
