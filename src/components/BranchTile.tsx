import Link from "next/link";

/**
 * One large tile pointing at a sub-page, used by every branch landing page
 * (Kitchen, Cooking, and whatever comes next). Square-ish and icon-forward so
 * it reads at a glance on a wall tablet — the whole tile is the tap target,
 * with no smaller link inside it.
 *
 * A tile's `badge` reports what needs attention, not how much is in there:
 * "12 low", never "87 items stocked". A sub-page with no real feature behind
 * it yet carries no badge at all.
 *
 * `wide` makes the tile span both grid columns — used to fill the odd slot
 * when a branch has an odd number of tiles, so the grid looks deliberate
 * rather than like something failed to load.
 */
export default function BranchTile({
  href,
  icon: Icon,
  title,
  badge,
  wide = false,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  badge?: string;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-5 text-center transition-colors hover:border-accent active:bg-surface-2 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <Icon size={32} className="text-muted" />
      <span className="text-lg font-semibold">{title}</span>
      {badge && (
        <span className="inline-block rounded-full bg-warn-soft px-3 py-1 text-sm font-medium text-warn">
          {badge}
        </span>
      )}
    </Link>
  );
}
