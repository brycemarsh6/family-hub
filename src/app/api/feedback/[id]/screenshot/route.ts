import { getVerifiedUser } from "@/lib/dal";
import { loadFeedbackScreenshot } from "@/lib/feedbackRead";

// One report's screenshot, for the admin detail sheet. Not in proxy.ts's
// PUBLIC_ROUTES: the proxy's cookie check is only UX, so the real gate is
// here, next to the data. Anyone who is not a signed-in admin gets a plain
// 404, the same answer as an unknown id, so the route does not even confirm
// that a report exists.
export const dynamic = "force-dynamic";

const NOT_FOUND = () => new Response("Not found", { status: 404 });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser();
  if (!user || user.role !== "admin") return NOT_FOUND();

  const { id } = await params;
  const shot = await loadFeedbackScreenshot(id);
  if (!shot) return NOT_FOUND();

  return new Response(Buffer.from(shot.bytes), {
    headers: {
      "Content-Type": shot.type,
      "Cache-Control": "private, no-store",
    },
  });
}
