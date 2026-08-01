import Link from "next/link";
import { Package, ShoppingCart, Hourglass, ChefHat } from "lucide-react";
import { db } from "@/lib/db";

// "force-dynamic" tells Next.js: never serve a cached copy of this page, always
// rebuild it from the database. Without it Next would happily show a snapshot
// taken at build time, and the badges below would silently go stale.
export const dynamic = "force-dynamic";

// Kitchen's own landing page — one large tile per sub-branch. This is now the
// only route into Inventory, Shopping, Expiring and Cooking: the global nav
// bar (see src/app/layout.tsx) doesn't drill down into a branch's own pages,
// so a branch needs a page like this to get you the rest of the way in.
//
// Each tile's badge reports what needs attention, not how much is in there —
// deliberately not "87 items stocked", just the count that means "go look at
// this." Expiring and Cooking don't have a real feature behind them yet, so
// they carry no badge at all.
export default async function KitchenPage() {
  const [toBuy, pantryItems] = await Promise.all([
    db.groceryItem.count({ where: { checked: false } }),
    db.pantryItem.findMany({ select: { quantity: true, lowThreshold: true } }),
  ]);

  // SQLite can't compare two columns to each other inside a `where`, so we
  // count the low items here instead. Fine at family scale (dozens of rows).
  const lowCount = pantryItems.filter(
    (item) => item.quantity <= item.lowThreshold,
  ).length;

  return (
    <div className="py-4">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Kitchen</h1>
      <p className="mt-2 text-base text-muted">
        What we need, and what we already have.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <BranchTile
          href="/kitchen/inventory"
          icon={Package}
          title="Inventory"
          badge={lowCount > 0 ? `${lowCount} low` : undefined}
        />
        <BranchTile
          href="/kitchen/shopping"
          icon={ShoppingCart}
          title="Shopping"
          badge={toBuy > 0 ? `${toBuy} to buy` : undefined}
        />
        <BranchTile href="/kitchen/expiring" icon={Hourglass} title="Expiring" />
        <BranchTile href="/kitchen/cooking" icon={ChefHat} title="Cooking" />
      </div>
    </div>
  );
}

/**
 * One sub-branch tile. Square-ish and icon-forward so it reads at a glance on
 * a wall tablet — the whole tile is the tap target, no smaller link inside it.
 */
function BranchTile({
  href,
  icon: Icon,
  title,
  badge,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-5 text-center transition-colors hover:border-accent active:bg-surface-2"
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
