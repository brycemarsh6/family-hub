import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PhotoImportPage() {
  return (
    <div className="py-2">
      <Link
        href="/kitchen/cooking/recipes/new"
        className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Add recipe
      </Link>

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        From a photo
      </h1>
      <p className="mt-2 text-sm text-muted">Coming soon.</p>
    </div>
  );
}
