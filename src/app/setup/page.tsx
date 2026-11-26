import { notFound } from "next/navigation";
import { MarsheeIcon } from "@/components/MarsheeIcon";
import { MarsheeWordmark } from "@/components/MarsheeWordmark";
import { isSetupOpen } from "@/lib/setupFlow";
import { SetupWizard } from "./SetupWizard";

// Reads the database, so it can never be cached.
export const dynamic = "force-dynamic";

/**
 * A relative's first visit to their own copy (family copies PR 6). A plain
 * 404 unless setup is open: not Bryce's copy, a setup code is configured, no
 * account exists yet and setup was never finished. The code itself lives in
 * the link's "#" part, so the wizard (not this page) reads and checks it.
 */
export default async function SetupPage() {
  if (!(await isSetupOpen())) notFound();

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center py-16">
      <h1 className="flex flex-col items-center gap-2">
        <MarsheeIcon className="h-16 w-16" />
        <MarsheeWordmark className="h-9 w-auto" />
      </h1>
      <p className="mt-1 text-center font-accent text-base italic text-muted">
        A family hub app designed to bring what matters together.
      </p>
      <SetupWizard />
    </div>
  );
}
