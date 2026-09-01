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
 * White text on every swatch: the palette is chosen (see AVATAR_COLORS'
 * comment in constants.ts) so white stays legible on top of each color in
 * both themes — the swatch itself is a fixed hex, so a light/dark theme
 * switch never changes it.
 *
 * That legibility is a *measured* constraint, not a visual impression. An
 * earlier version of this comment said it had been "verified visually
 * against all 8 colors," and that verification was wrong: three of the
 * then-current swatches actually failed WCAG AA against white (green
 * 3.30:1, amber 3.19:1, teal 3.74:1). Every swatch in the palette today
 * clears 4.6:1, computed. If you change a swatch, compute the ratio —
 * looking at it is exactly how this was missed before.
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
