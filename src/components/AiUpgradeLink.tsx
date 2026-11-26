import { ExternalLink } from "lucide-react";
import { AI_UPGRADE_BUTTON } from "@/lib/aiMeterVocabulary";

/**
 * The Upgrade button: a link styled as a full-width 48px button, opened in a
 * new tab. Shared by the blocked-call notice and the Settings AI card
 * (mission 89). `className` is only the caller's spacing.
 */
export function AiUpgradeLink({ href, className = "" }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition-opacity active:opacity-80 ${className}`}
    >
      {AI_UPGRADE_BUTTON}
      <ExternalLink aria-hidden="true" size={18} />
    </a>
  );
}
