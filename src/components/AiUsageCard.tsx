import { AiUpgradeLink } from "@/components/AiUpgradeLink";
import { ProgressBar } from "@/components/ProgressBar";
import type { AiUsageCardData } from "@/lib/aiUsageRead";
import {
  AI_CARD_TITLE,
  AI_LOCKED_TEXT,
  AI_USED_BAR_LABEL,
  aiUsedPercentText,
  aiUsedUpText,
} from "@/lib/aiMeterVocabulary";

/**
 * The "AI features" section on /settings (parents and admins, real logins).
 * Bryce's copy shows dollars, the request count and a per-feature line, with
 * no limit. A relative's copy shows a percent bar and the reset day, never
 * dollars; used up turns the bar warn (amber, not red: nothing is wrong, it
 * just resets). Only an admin with an Upgrade link sees the button. Plain
 * server markup, no state.
 */
export function AiUsageCard({ data }: { data: AiUsageCardData }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{AI_CARD_TITLE}</h2>

      <div className="mt-3 rounded-xl border border-line bg-surface p-4">
        {data.kind === "owner" ? (
          <>
            <p className="text-base font-medium">{data.summary}</p>
            {data.byFeatureLine && (
              <p className="mt-1 text-sm text-muted">{data.byFeatureLine}</p>
            )}
          </>
        ) : data.state === "locked" ? (
          <p className="text-base font-medium">{AI_LOCKED_TEXT}</p>
        ) : (
          <>
            <p className="text-base font-medium">
              {data.state === "used-up"
                ? aiUsedUpText(data.resetsOn)
                : aiUsedPercentText(data.percent, data.resetsOn)}
            </p>
            <div className="mt-3">
              <ProgressBar
                fraction={data.percent / 100}
                label={AI_USED_BAR_LABEL}
                tone={data.state === "used-up" ? "warn" : "accent"}
              />
            </div>
          </>
        )}

        {data.kind === "relative" && data.upgradeUrl && (
          <AiUpgradeLink href={data.upgradeUrl} className="mt-4" />
        )}
      </div>
    </section>
  );
}
