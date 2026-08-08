import { BackLink } from "@/components/BackLink";
import { PhotoImportForm } from "@/components/PhotoImportForm";

export default async function PhotoImportPage({
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
        From a photo
      </h1>
      <p className="mb-4 text-sm text-muted">
        A cookbook page, a handwritten card, or a screenshot — we&apos;ll pull
        out the recipe for you to review before saving.
      </p>

      <PhotoImportForm cookbookId={cookbookId} />
    </div>
  );
}
