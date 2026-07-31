import { HubBottomNav } from "@/components/HubNav";

// Wraps the dashboard and the branches that don't yet have a nav of their own
// (Calendar, Chores, Lists) with the hub's top-level tab bar.
//
// "(hub)" in the folder name is a Next.js *route group*: the parentheses mean
// the folder groups files under a shared layout without becoming part of the
// URL. So (hub)/page.tsx is still "/", not "/hub". Kitchen sits outside this
// group precisely so it gets its own bar instead of this one.
export default function HubLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      {/* pb-28 leaves room for the fixed bottom tab bar so the last row of a
          page is never trapped underneath it. */}
      <div className="pb-28 pt-4">{children}</div>

      <HubBottomNav />
    </div>
  );
}
