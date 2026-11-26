import "server-only";
import { isOwnerCopy } from "@/lib/copyConfig";
import { aiAccess, percentUsed, type AiFeature } from "@/lib/aiMeterPolicy";
import {
  AI_FEATURE_LABELS,
  aiOwnerText,
  formatUsd,
} from "@/lib/aiMeterVocabulary";
import type { CalendarDate } from "@/lib/householdDate";
import { aiUpgradeUrl, allowanceCents, loadAiMonthSummary } from "@/lib/aiMeter";

// What the Settings "AI features" card shows (mission 89). Bryce's copy gets
// dollars, a request count and a per-feature line. A relative's copy gets a
// percent and the reset day, never dollars.

export type AiUsageCardData =
  | { kind: "owner"; summary: string; byFeatureLine: string }
  | {
      kind: "relative";
      state: "allow" | "used-up" | "locked";
      percent: number;
      resetsOn: CalendarDate;
      /** Admins only, and only when the copy has an Upgrade link. */
      upgradeUrl: string | null;
    };

/** "Recipe import $0.12, Meal ideas $0.06": the two recipe features share one line. */
function featureLine(byFeature: { feature: string; costMicroUsd: number }[]): string {
  const totals = new Map<string, number>();
  for (const row of byFeature) {
    const label = AI_FEATURE_LABELS[row.feature as AiFeature] ?? row.feature;
    totals.set(label, (totals.get(label) ?? 0) + row.costMicroUsd);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, micro]) => `${label} ${formatUsd(micro)}`)
    .join(", ");
}

export async function loadAiUsageCard(isAdmin: boolean): Promise<AiUsageCardData> {
  const month = await loadAiMonthSummary(new Date());
  if (isOwnerCopy()) {
    return {
      kind: "owner",
      summary: aiOwnerText(month.usedMicroUsd, month.requests),
      byFeatureLine: featureLine(month.byFeature),
    };
  }
  const allowance = allowanceCents();
  const state = aiAccess({
    isOwner: false,
    allowanceCents: allowance,
    usedMicroUsd: month.usedMicroUsd,
  });
  return {
    kind: "relative",
    state,
    percent: percentUsed(month.usedMicroUsd, allowance),
    resetsOn: month.resetsOn,
    upgradeUrl: isAdmin && state !== "allow" ? aiUpgradeUrl() : null,
  };
}
