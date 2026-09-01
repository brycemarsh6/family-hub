import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Cormorant_Garamond } from "next/font/google";
import Link from "next/link";
import "../globals.css";
import { HubBottomNav } from "@/components/HubNav";
import { UserMenu } from "@/components/UserMenu";
import { getVerifiedUser } from "@/lib/dal";
// The header renders the brand lockup as vector components, not a PNG. The
// master artwork Bryce traced lives in brand/ (never imported by app code —
// see STRUCTURE.md); src/app/icon.png, apple-icon.png, and favicon.ico are
// all generated from those same masters, for the browser tab/home-screen
// icon. Rendering vectors here instead of an <Image> of a generated PNG
// means the header logo stays crisp at any screen density, and there's
// still only one place (brand/) to ever edit the artwork.
import { MarsheeWordmark } from "@/components/MarsheeWordmark";

// Marshee's three brand faces. Named --font-inter/--font-manrope/
// --font-accent-serif (not --font-sans etc.) so they don't collide with the
// Tailwind theme keys defined in globals.css's @theme inline block — see
// the comment there for why a same-named self-reference silently breaks.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

// Cormorant Garamond has no variable-font build in this setup, so (unlike
// Inter/Manrope above) it needs an explicit weight. It's used italic at one
// size only — the login page's tagline — so a single weight is all this
// needs; the italic styling itself is applied with Tailwind's `italic` class
// where it's used, not baked in here.
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-accent-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marshee",
  description: "Shopping and inventory for the family.",
};

export const viewport: Viewport = {
  // `viewportFit: "cover"` lets us paint into the rounded corners on modern
  // phones; branches with their own bottom tab bar (like Kitchen) add
  // safe-area padding themselves to stay clear of the home indicator.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b16" },
  ],
};

// This layout wraps every page in the authenticated app: the logo bar up
// top, the fixed tab bar along the bottom, and the page itself in between.
// One nav for the whole app — it doesn't change contents as you move between
// the dashboard and a branch like Kitchen, only which tab is lit up. Getting
// from a branch's own tab (e.g. Kitchen) into its sub-pages (Inventory,
// Shopping...) is the job of that branch's own landing page now, not a
// second nav bar.
//
// Lives inside the (app) route group rather than directly under app/ because
// this is one of two root layouts in the project (see src/app/share/layout.tsx
// for the other) — a shared recipe page needs to render with none of this
// chrome (no header, no nav, no getSession() call), and Next.js's documented
// way to give a route subtree a genuinely separate <html>/<body> is multiple
// root layouts via route groups, not a conditional inside one shared layout.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Only to decide whether/what to show in the header (the identity button,
  // with the right name/color/role) — this is not a security check itself.
  // The real protection lives in the DAL's per-action guard, next to the
  // data (see src/lib/dal.ts). getVerifiedUser() is the same cached lookup
  // a page calling requireVerifiedUser()/getVerifiedSession() elsewhere in
  // this same request already triggers, so this doesn't add an extra
  // database round trip on top of what the page itself needs.
  const user = await getVerifiedUser();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${cormorantGaramond.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <header className="print:hidden sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3">
            {/* The wordmark alone, in brand Sage — no icon tile beside it.
                The mark and the word say the same thing, so showing both in
                a 48px-tall bar just crowds it; the tile still carries the
                brand on the home screen and the browser tab, where there's
                no room for a word. */}
            <Link href="/" className="flex min-h-12 items-center">
              <MarsheeWordmark className="h-8 w-auto text-brand-sage" />
            </Link>
            {user && (
              <UserMenu
                displayName={user.displayName}
                avatarColor={user.avatarColor}
                role={user.role}
              />
            )}
          </div>
        </header>

        {/* pb-28 leaves room for the fixed bottom tab bar so the last row of
            a page is never trapped underneath it. */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4 print:pb-0">
          {children}
        </main>

        <HubBottomNav />
      </body>
    </html>
  );
}
