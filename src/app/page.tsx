import Link from "next/link";
import { ChefHat } from "lucide-react";

// The family dashboard: an overview of what matters across the whole hub,
// with widgets that link into each branch (Kitchen, and later Calendar,
// Chores, Lists...). The widget layer is deliberately not built yet — for
// now this is just a plain link in, so Kitchen stays reachable.
export default function DashboardPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Marsh Hub
      </h1>
      <p className="mt-2 text-base text-muted">Dashboard coming soon.</p>

      <Link
        href="/kitchen"
        className="mt-6 flex min-h-16 w-full max-w-xs items-center gap-3 rounded-2xl border border-line bg-surface px-5 transition-colors hover:border-accent active:bg-surface-2"
      >
        <ChefHat aria-hidden="true" size={24} className="text-muted" />
        <span className="text-lg font-semibold">Kitchen</span>
      </Link>
    </div>
  );
}
