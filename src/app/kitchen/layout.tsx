import { KitchenBottomNav } from "@/components/KitchenNav";

// Wraps every page under /kitchen/* with the Kitchen branch's own nav: a fixed
// tab bar along the bottom of the screen, at every size. The top-level
// dashboard (src/app/page.tsx) doesn't get this — it's outside /kitchen, so
// this layout never applies to it.
export default function KitchenLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      {/* pb-28 leaves room for the fixed bottom tab bar so the last row of a
          list is never trapped underneath it. */}
      <div className="pb-28 pt-4">{children}</div>

      <KitchenBottomNav />
    </div>
  );
}
