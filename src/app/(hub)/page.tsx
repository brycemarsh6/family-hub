import Link from "next/link";
import { ChefHat, ShoppingCart, Package } from "lucide-react";
import { db } from "@/lib/db";

// "force-dynamic" tells Next.js: never serve a cached copy of this page, always
// rebuild it from the database. Without it Next would happily show a snapshot
// taken at build time, and the counts below would silently go stale.
export const dynamic = "force-dynamic";

// The family dashboard — the first thing you see when you open the app. Each
// branch of the hub gets a widget here: a headline of what needs attention,
// and a tap straight into that branch. Kitchen is the only branch built so
// far; Calendar, Chores and Lists will each add a widget alongside it.
export default async function DashboardPage() {
  const [toBuy, pantryTotal, pantryItems] = await Promise.all([
    db.groceryItem.count({ where: { checked: false } }),
    db.pantryItem.count(),
    db.pantryItem.findMany({ select: { quantity: true, lowThreshold: true } }),
  ]);

  // SQLite can't compare two columns to each other inside a `where`, so we
  // count the low items here instead. Fine at family scale (dozens of rows).
  const lowCount = pantryItems.filter(
    (item) => item.quantity <= item.lowThreshold,
  ).length;

  return (
    <div className="py-4">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Marsh Hub
      </h1>
      <p className="mt-2 text-base text-muted">
        What needs attention around the house.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <BranchWidget
          href="/kitchen"
          icon={ChefHat}
          title="Kitchen"
          alert={lowCount > 0 ? `${lowCount} running low` : undefined}
          stats={[
            {
              icon: ShoppingCart,
              label: toBuy === 1 ? "item to buy" : "items to buy",
              value: toBuy,
            },
            {
              icon: Package,
              label: pantryTotal === 1 ? "item stocked" : "items stocked",
              value: pantryTotal,
            },
          ]}
        />
      </div>
    </div>
  );
}

/**
 * One branch of the hub, as it appears on the dashboard: the branch name, a
 * couple of at-a-glance numbers, and an optional alert badge for the thing
 * that actually wants doing. The whole card is the tap target.
 */
function BranchWidget({
  href,
  icon: Icon,
  title,
  stats,
  alert,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  stats: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: number;
  }[];
  alert?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent active:bg-surface-2"
    >
      <div className="flex items-center gap-3">
        <Icon size={24} className="text-muted" />
        <span className="text-xl font-semibold">{title}</span>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {stats.map((stat) => (
          <span key={stat.label} className="flex items-baseline gap-1.5">
            <stat.icon size={16} className="text-muted" />
            <span className="text-lg font-semibold tabular-nums">
              {stat.value}
            </span>
            <span className="text-sm text-muted">{stat.label}</span>
          </span>
        ))}
      </div>

      {alert && (
        <span className="inline-block self-start rounded-full bg-warn-soft px-3 py-1 text-sm font-medium text-warn">
          {alert}
        </span>
      )}
    </Link>
  );
}
