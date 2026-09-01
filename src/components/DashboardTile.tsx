import Link from "next/link";

/**
 * The shared shell behind all four dashboard tiles: a header row (icon,
 * title, an optional "go look at this" badge) and a body of whatever
 * content that tile wants to show. The whole tile is the tap target, same
 * rule as BranchTile — no smaller link or button living inside it, so a
 * tap anywhere on the card always does the one obvious thing.
 *
 * `wide` spans both grid columns — Today's meals and Recipes use it,
 * Inventory and Grocery sit side by side without it. Same prop, same
 * meaning, as BranchTile's own `wide`.
 *
 * `icon` takes an already-rendered element (`<Package size={20} .../>`),
 * never a bare component reference. This is the BranchTile/PlanWeekTile
 * lesson again: TodayMealsTile is a Client Component, and a function
 * (a bare component reference) can't cross the Server-to-Client boundary
 * as a prop — only an already-rendered element can. Every caller on the
 * dashboard page renders its icon the same way, so nobody "fixes" one
 * tile back into that bug later.
 */
export default function DashboardTile({
  href,
  icon,
  title,
  badge,
  wide = false,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent active:bg-surface-2 ${
        wide ? "col-span-2" : ""
      }`}
    >
      {/*
        `flex-wrap` and the `shrink-0` icon slot together are load-bearing at
        375px, not tidiness. A half-width tile's header has ~131px of room,
        and icon + title + badge want ~161px — without wrap the badge won
        the fight and flex crushed the icon to *zero width*, so Inventory
        and Grocery silently lost their icons on the exact screen this app
        is designed for, while looking fine on a laptop. Now the badge drops
        to its own line when it doesn't fit and the icon always survives.

        One consequence to know before adding a badge to a *wide* tile
        (Meals and Recipes have none today): this row dropped the `ml-auto`
        that used to pin the badge right. On a narrow tile that's what lets
        it wrap; on a wide one there's room to spare and no wrap to save it,
        so a badge would sit inline right after the title rather than at the
        far edge. Decide which you want then — don't just re-add `ml-auto`,
        or the narrow tiles go back to eating their own icons.
      */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="flex shrink-0 items-center">{icon}</span>
        <span className="text-base font-semibold">{title}</span>
        {badge && (
          <span className="inline-block shrink-0 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">
            {badge}
          </span>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </Link>
  );
}
