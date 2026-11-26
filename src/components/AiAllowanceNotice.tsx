import { AiUpgradeLink } from "@/components/AiUpgradeLink";
import type { AiBlocked } from "@/lib/aiBlocked";
import {
  AI_ASK_ADMIN_TEXT,
  AI_BLOCKED_TITLE,
  AI_LOCKED_TEXT,
  aiBlockedResetsLine,
} from "@/lib/aiMeterVocabulary";

/**
 * The message that takes the place of an AI result when this copy's monthly
 * allowance blocks the call (mission 89). Admins get the Upgrade link (when the
 * copy has one); everyone else is told to ask an admin. Warn, not danger: the
 * person did nothing wrong and nothing is lost. Shared by the six AI screens.
 */
export function AiAllowanceNotice({ aiBlocked }: { aiBlocked: AiBlocked }) {
  return (
    <div role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-left text-warn">
      {aiBlocked.reason === "locked" ? (
        <p className="text-sm font-semibold">{AI_LOCKED_TEXT}</p>
      ) : (
        <>
          <p className="text-sm font-semibold">{AI_BLOCKED_TITLE}</p>
          <p className="mt-1 text-sm">{aiBlockedResetsLine(aiBlocked.resetsLabel)}</p>
        </>
      )}
      {aiBlocked.isAdmin ? (
        aiBlocked.upgradeUrl && <AiUpgradeLink href={aiBlocked.upgradeUrl} className="mt-3" />
      ) : (
        <p className="mt-2 text-sm font-medium">{AI_ASK_ADMIN_TEXT}</p>
      )}
    </div>
  );
}
