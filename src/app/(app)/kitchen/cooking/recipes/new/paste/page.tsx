import { BackLink } from "@/components/BackLink";
import { PasteImportForm } from "@/components/PasteImportForm";

export default function PasteImportPage() {
  return (
    <div className="py-2">
      <BackLink href="/kitchen/cooking/recipes/new" label="Add recipe" />

      <h1 className="mb-1 text-2xl font-bold tracking-tight md:text-3xl">
        Paste text
      </h1>
      <p className="mb-4 text-sm text-muted">
        Paste the whole page — life story, ads, and all. We&apos;ll pull out
        just the recipe for you to review before saving.
      </p>

      <PasteImportForm />
    </div>
  );
}
