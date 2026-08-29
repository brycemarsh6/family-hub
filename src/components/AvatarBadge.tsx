import { avatarColorHex } from "@/lib/constants";

/**
 * The shared "who is this" circle — the login page's person chips, the
 * header's identity button, and (later, Manage Family) a row per household
 * member all render the same thing: a color swatch from AVATAR_COLORS
 * (src/lib/constants.ts) with the person's first initial on top. One
 * component so all three places can never drift into slightly different
 * circles.
 *
 * Deliberately no image support — see the plan's decision (and Recipes v2's
 * C7) for why this app has no blob storage and isn't taking that on for
 * avatars either. `avatarColor` is a fixed swatch *name* (e.g. "blue"), not
 * a hex value — see AVATAR_COLORS' own doc comment for why storing the name
 * (not the hex) is what lets the palette be retuned later without
 * stranding anyone on a color that no longer exists.
 *
 * White text on every swatch: the palette was chosen (see AVATAR_COLORS'
 * comment in constants.ts) specifically so white stays legible on top of
 * each color in both themes — the swatch itself is a fixed hex, so a light/
 * dark theme switch never changes it. Verified visually against all 8
 * colors rather than assumed (see the C2 report).
 */
export function AvatarBadge({
  displayName,
  avatarColor,
  size = 40,
  className = "",
}: {
  displayName: string;
  avatarColor: string;
  size?: number;
  className?: string;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      // Decorative — every place this is used already shows the name as
      // real text right next to it (a login chip's label, the header
      // button's own aria-label), so the initial itself needs no separate
      // announcement.
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColorHex(avatarColor),
        fontSize: Math.max(12, Math.round(size * 0.42)),
      }}
    >
      {initial}
    </span>
  );
}
