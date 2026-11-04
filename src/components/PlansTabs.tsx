import Link from "next/link";

const TABS = [
  { view: "week", label: "This week" },
  { view: "goals", label: "Goals" },
] as const;

/**
 * Plans & Goals' segmented control: a row of links, one lit. Links (not
 * buttons) so each view is a real URL the server renders, and Back works.
 */
export function PlansTabs({ view }: { view: "week" | "goals" }) {
  return (
    <nav aria-label="Plans views" className="mb-4 grid grid-cols-2 rounded-2xl bg-surface-2 p-1">
      {TABS.map((tab) => {
        const current = tab.view === view;
        return (
          <Link
            key={tab.view}
            href={`/plans?view=${tab.view}`}
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
