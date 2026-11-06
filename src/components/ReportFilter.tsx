"use client";

import { useRouter } from "next/navigation";
import { HabitFilterChips, TIME_ICONS, type HabitFilterOption } from "./HabitFilterChips";

/**
 * The Report's filter row (decision 169): `HabitFilterChips` as Today shows it,
 * with the times of day wearing the same icons. A tap goes to the option's
 * address, so the choice lives in the URL and holds across views and refreshes.
 */
export function ReportFilter({ options, value }: { options: { key: string; label: string; href: string }[]; value: string }) {
  const router = useRouter();
  const chips: HabitFilterOption[] = options.map(({ key, label }) => {
    const time = key.startsWith("time:") ? (key.slice(5) as keyof typeof TIME_ICONS) : null;
    return { key, label, icon: time ? TIME_ICONS[time] : undefined };
  });
  return <HabitFilterChips options={chips} value={value} onChange={(key) => router.push(options.find((option) => option.key === key)!.href)} />;
}
