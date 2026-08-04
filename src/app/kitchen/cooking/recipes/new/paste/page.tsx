import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PasteImportForm } from "@/components/PasteImportForm";

export default function PasteImportPage() {
  return (
    <div className="py-2">
      <Link
        href="/kitchen/cooking/recipes/new"
        className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Add recipe
      </Link>

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
