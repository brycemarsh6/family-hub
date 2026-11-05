import { requireVerifiedUser } from "@/lib/dal";

// Reads the session, so it can never be cached.
export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  await requireVerifiedUser();

  return (
    <div className="py-2">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Habits &amp; Chores</h1>
      <p className="mt-2 text-sm text-muted">Coming soon.</p>
    </div>
  );
}
