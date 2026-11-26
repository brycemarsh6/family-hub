/**
 * A thin 0 to 100% bar. `label` is what a screen reader hears, e.g. "Weigh 165 lb progress".
 * `tone` is the fill's job: the usual accent, or warn for "running out, nothing wrong".
 */
export function ProgressBar({
  fraction,
  label,
  tone = "accent",
}: {
  fraction: number;
  label: string;
  tone?: "accent" | "warn";
}) {
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div
        className={`h-full rounded-full ${tone === "warn" ? "bg-warn" : "bg-accent"}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
