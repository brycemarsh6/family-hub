import Link from "next/link";

/**
 * The app's one tab control for switching views of a page (Plans & Goals,
 * the Habits Report): a row of links, one lit. Links (not buttons) so each
 * view is a real URL the server renders, and Back works. A new tab is a new
 * column, never a second control.
 */
export function PageTabs<Key extends string>({
  label,
  tabs,
  value,
}: {
  /** The nav's spoken name, "Plans views". */
  label: string;
  tabs: readonly { key: Key; label: string; href: string }[];
  value: Key;
}) {
  return (
    <nav aria-label={label} className="mb-4 grid rounded-2xl bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((tab) => {
        const current = tab.key === value;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold ${
              current ? "bg-surface text-fg" : "text-muted-strong"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
