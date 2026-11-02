import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * "Back to wherever you came from" — the one way up a level in this app.
 *
 * The side drawer reaches every destination directly (Recipes, Shopping,
 * Inventory and so on), but it only goes *across*, never up from a page
 * below a destination. So without this, a recipe's detail page had no way
 * back to the recipe list except reopening the drawer. This is that edge.
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
