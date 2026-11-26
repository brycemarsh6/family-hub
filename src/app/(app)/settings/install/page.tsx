import { BackLink } from "@/components/BackLink";
import { InstallHelp } from "@/components/InstallHelp";
import { requireVerifiedUser } from "@/lib/dal";
import { NARROW_PAGE_CLASSES } from "@/lib/gridClasses";
import { INSTALL_WORDS } from "@/lib/welcomeVocabulary";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * How to put Marshee on a phone's Home Screen. Every login may read it (it is
 * only help), so this checks the session and nothing more.
 */
export default async function InstallPage() {
  await requireVerifiedUser();

  return (
    <div className="py-2" data-page-width="wide">
      <div className={NARROW_PAGE_CLASSES}>
        <BackLink href="/settings" label="Settings" />
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{INSTALL_WORDS.title}</h1>
        <InstallHelp />
      </div>
    </div>
  );
}
