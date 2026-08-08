import { BackLink } from "@/components/BackLink";
import { LinkImportForm } from "@/components/LinkImportForm";

export default async function LinkImportPage({
  searchParams,
}: {
  searchParams: Promise<{ cookbookId?: string }>;
}) {
  const { cookbookId } = await searchParams;
  const backHref = cookbookId
    ? `/kitchen/cooking/recipes/new?cookbookId=${cookbookId}`
    : "/kitchen/cooking/recipes/new";

  return (
    <div className="py-2">
      <BackLink href={backHref} label="Add recipe" />

      <h1 className="mb-1 text-2xl font-bold tracking-tight md:text-3xl">
        From a link
      </h1>
      <p className="mb-4 text-sm text-muted">
        Paste a link to a recipe blog, a TikTok, or a Pinterest pin —
        we&apos;ll pull out the recipe for you to review before saving.
      </p>

      <LinkImportForm cookbookId={cookbookId} />
    </div>
  );
}
