import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { ROLE_LABELS, type Role } from "@/lib/constants";

/**
 * Who you are, at the top of Settings (it used to sit in the side drawer).
 * An account taps through to /profile; a device login (the wall tablet) has
 * no profile page, so its card is plain.
 */
export function SettingsAccountCard({
  displayName,
  avatarColor,
  role,
  isDevice,
}: {
  displayName: string;
  avatarColor: string;
  role: Role;
  isDevice: boolean;
}) {
  const body = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <AvatarBadge displayName={displayName} avatarColor={avatarColor} size={40} />
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold">{displayName}</span>
          <span className="block text-sm text-muted">{ROLE_LABELS[role]}</span>
        </span>
      </span>
      {!isDevice && (
        <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
      )}
    </>
  );
  const className =
    "mt-4 flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4";

  return isDevice ? (
    <div className={className}>{body}</div>
  ) : (
    <Link
      href="/profile"
      className={`${className} transition-colors active:bg-surface-2`}
    >
      {body}
    </Link>
  );
}
