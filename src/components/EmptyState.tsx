/** Shown in place of a list when there's nothing in it yet. */
export function EmptyState({
  emoji,
  title,
  hint,
}: {
  emoji: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <span aria-hidden="true" className="text-4xl">
        {emoji}
      </span>
      <p className="mt-3 text-lg font-semibold">{title}</p>
      <p className="mt-1 text-base text-muted">{hint}</p>
    </div>
  );
}
