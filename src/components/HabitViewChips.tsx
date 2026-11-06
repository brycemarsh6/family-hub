import Link from "next/link";
import { User, Users } from "lucide-react";

/**
 * The "Mine" / "Whole family" switch (decision 95) above both views. The choice
 * is the URL (`/habits` or `/habits?view=family`), so a refresh or a shared link
 * lands on the same view. Same pill look as `HabitFilterChips`, but links.
 */
export function HabitViewChips({ view }: { view: "mine" | "family" }) {
  const chips = [
    { key: "mine", label: "Mine", href: "/habits", icon: User },
    { key: "family", label: "Whole family", href: "/habits?view=family", icon: Users },
  ] as const;
  return (
    <div role="group" aria-label="Whose habits" className="mb-4 flex gap-2">
      {chips.map(({ key, label, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          replace
          scroll={false}
          aria-current={view === key ? "page" : undefined}
          className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
            view === key ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-muted"
          }`}
        >
          <Icon aria-hidden="true" size={16} />
          {label}
        </Link>
      ))}
    </div>
  );
}
