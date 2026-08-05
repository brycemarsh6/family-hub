import Link from "next/link";
import { Keyboard, ClipboardPaste, Camera, Link2 } from "lucide-react";
import { BackLink } from "@/components/BackLink";

// Every import path — typed, pasted, photo, link — lands here first. Photo
// and link are visible now (per the Recipes plan's "no feature is stubbed
// out early" rule) but just point at "Coming soon" pages until R3b/R3c wire
// them up; Type it in and Paste text are both real.
export default function NewRecipeChooserPage() {
  return (
    <div className="py-2">
      <BackLink href="/kitchen/cooking/recipes" label="Recipes" />

      <h1 className="mb-1 text-2xl font-bold tracking-tight md:text-3xl">
        Add recipe
      </h1>
      <p className="mb-4 text-sm text-muted">How do you want to add it?</p>

      <div className="flex flex-col gap-2">
        <ChooserOption
          href="/kitchen/cooking/recipes/new/manual"
          icon={Keyboard}
          title="Type it in"
          hint="Fill out a blank form"
        />
        <ChooserOption
          href="/kitchen/cooking/recipes/new/paste"
          icon={ClipboardPaste}
          title="Paste text"
          hint="Copy a recipe from anywhere and paste it in"
        />
        <ChooserOption
          href="/kitchen/cooking/recipes/new/photo"
          icon={Camera}
          title="From a photo"
          hint="Snap a cookbook page or a screenshot"
        />
        <ChooserOption
          href="/kitchen/cooking/recipes/new/link"
          icon={Link2}
          title="From a link"
          hint="Paste a URL to a recipe blog"
        />
      </div>
    </div>
  );
}

function ChooserOption({
  href,
  icon: Icon,
  title,
  hint,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-4 rounded-xl border border-line bg-surface px-4 transition-colors active:bg-surface-2"
    >
      <Icon aria-hidden="true" size={24} className="shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{title}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </Link>
  );
}
