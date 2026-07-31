import Link from "next/link";
import { db } from "@/lib/db";

// "force-dynamic" tells Next.js: never serve a cached copy of this page, always
// rebuild it from the database. Without it Next would happily show a snapshot
// taken at build time, and the counts below would silently go stale.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Ask the database three questions at once rather than one after another.
  // Promise.all runs them in parallel, so the page waits for the slowest, not
  // the sum of all three.
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
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Kitchen</h1>
      <p className="mt-2 text-base text-muted">
        What we need, and what we already have.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <HomeCard
          href="/groceries"
          emoji="🛒"
          title="Shopping"
          detail={
            toBuy === 0
              ? "Nothing on the list"
              : `${toBuy} ${toBuy === 1 ? "item" : "items"} to buy`
          }
        />
        <HomeCard
          href="/pantry"
          emoji="🥫"
          title="Inventory"
          detail={`${pantryTotal} ${pantryTotal === 1 ? "item" : "items"} stocked`}
          badge={lowCount > 0 ? `${lowCount} running low` : undefined}
        />
      </div>
    </div>
  );
}

function HomeCard({
  href,
  emoji,
  title,
  detail,
  badge,
}: {
  href: string;
  emoji: string;
  title: string;
  detail: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-40 flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent active:bg-surface-2"
    >
      <span aria-hidden="true" className="text-4xl">
        {emoji}
      </span>
      <span>
        <span className="block text-xl font-semibold">{title}</span>
        <span className="mt-1 block text-base text-muted">{detail}</span>
        {badge && (
          <span className="mt-3 inline-block rounded-full bg-warn-soft px-3 py-1 text-sm font-medium text-warn">
            {badge}
          </span>
        )}
      </span>
    </Link>
  );
}
