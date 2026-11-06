import { BackLink } from "@/components/BackLink";
import { FeedbackList } from "@/components/FeedbackList";
import { PageTabs } from "@/components/PageTabs";
import { requireRole } from "@/lib/dal";
import { loadFeedbackList } from "@/lib/feedbackRead";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

const TABS = [
  { key: "new", label: "New", href: "/settings/feedback" },
  { key: "done", label: "Done", href: "/settings/feedback?tab=done" },
] as const;

/**
 * Admin-only: what people sent from "Send feedback", newest first. New is
 * everything not marked done. `requireRole("admin")` bounces anyone else to
 * `/`, and the reader (feedbackRead.ts) trusts this gate.
 */
export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireRole("admin");
  const { tab } = await searchParams;
  const status = tab === "done" ? "done" : "new";
  const items = await loadFeedbackList(status);

  return (
    <div className="py-2">
      <BackLink href="/settings" label="Settings" />

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Feedback</h1>
      <p className="mb-4 mt-1 text-sm text-muted">What the family sent from Send feedback.</p>

      <PageTabs label="Feedback views" tabs={TABS} value={status} />

      <FeedbackList items={items} status={status} />
    </div>
  );
}
