import { KitchenTopNav, KitchenBottomNav } from "@/components/KitchenNav";

// Wraps every page under /kitchen/* with the Kitchen branch's own nav: a
// horizontal bar on tablets/laptops, a fixed tab bar along the bottom on
// phones. The top-level dashboard (src/app/page.tsx) doesn't get this —
// it's outside /kitchen, so this layout never applies to it.
export default function KitchenLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <div className="hidden border-b border-line pb-3 md:block">
        <KitchenTopNav />
      </div>

      {/* pb-28 leaves room for the fixed bottom tab bar on phones so the last
          row of a list is never trapped underneath it. */}
      <div className="pb-28 pt-4 md:pb-10 md:pt-6">{children}</div>

      <KitchenBottomNav />
    </div>
  );
}
