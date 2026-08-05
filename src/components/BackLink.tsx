import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * "Back to wherever you came from" — the one way up a level in this app.
 *
 * The global nav bar only reaches branch roots (Kitchen, Calendar, Home,
 * Chores, Lists), and a branch landing page only reaches *down* into its own
 * sub-pages. So without this, anything deeper than a landing page was a
 * dead end: getting from a recipe back to the recipe list meant tapping
 * Kitchen, then Cooking, then Recipes. This is that missing edge.
 *
 * It points at an explicit `href` rather than calling `router.back()`, so the
 * destination is the page's real parent no matter how you arrived — following
 * a shared link, a redirect after saving, or a reload. Browser history would
 * be right most of the time and confusing exactly when it isn't.
 *
 * `label` names the destination ("Recipes"), not the action ("Back"), so the
 * link says where you'll land. Sized to the house's 48px-ish touch minimum.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted transition-colors active:text-fg"
    >
      <ArrowLeft aria-hidden="true" size={16} />
      {label}
    </Link>
  );
}
