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
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-base font-semibold">{title}</span>
        {badge && (
          <span className="ml-auto inline-block shrink-0 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">
            {badge}
          </span>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </Link>
  );
}
