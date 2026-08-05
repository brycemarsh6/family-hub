import { BackLink } from "@/components/BackLink";
import { PhotoImportForm } from "@/components/PhotoImportForm";

export default function PhotoImportPage() {
  return (
    <div className="py-2">
      <BackLink href="/kitchen/cooking/recipes/new" label="Add recipe" />

      <h1 className="mb-1 text-2xl font-bold tracking-tight md:text-3xl">
        From a photo
      </h1>
      <p className="mb-4 text-sm text-muted">
        A cookbook page, a handwritten card, or a screenshot — we&apos;ll pull
        out the recipe for you to review before saving.
      </p>

      <PhotoImportForm />
    </div>
  );
}
