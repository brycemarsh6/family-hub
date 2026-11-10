import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Cormorant_Garamond } from "next/font/google";
import "../globals.css";
import { AppChrome } from "@/components/AppChrome";
import { getVerifiedUser } from "@/lib/dal";
import { DEFAULT_NAV_MODE } from "@/lib/navMode";
import { DEFAULT_TEXT_SIZE } from "@/lib/textSize";
import { loadScreensaverSettings } from "@/lib/screensaverRead";

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
  // phones; `AppChrome`'s `<main>` and the fixed bottom controls (AddItemBar,
  // FloatingAddButton) add safe-area padding themselves to stay clear of the
  // home indicator.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b16" },
  ],
};

// This layout wraps every page in the authenticated app. The chrome around
// the page (the wordmark header on the dashboard and /login, the floating
// hamburger and its side drawer everywhere else, and <main>) lives in
// AppChrome, a client component, because which of those it shows depends on
// the current path. One drawer for the whole app: it doesn't change contents
// as you move around, only which row is lit.
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
  // Only to decide whether/what to show in the chrome (the hamburger, and the
  // drawer's identity row with the right name/color/role) — this is not a
  // security check itself.
  // The real protection lives in the DAL's per-action guard, next to the
  // data (see src/lib/dal.ts). getVerifiedUser() is the same cached lookup
  // a page calling requireVerifiedUser()/getVerifiedSession() elsewhere in
  // this same request already triggers, so this doesn't add an extra
  // database round trip on top of what the page itself needs.
  const user = await getVerifiedUser();
  // The wall tablet's screensaver is for a device login only; every other
  // login gets null, so no screensaver is mounted and no settings are read.
  const screensaver = user?.isDevice ? await loadScreensaverSettings() : null;

  return (
    <html
      lang="en"
      data-text-size={user?.textSize ?? DEFAULT_TEXT_SIZE}
      className={`${inter.variable} ${manrope.variable} ${cormorantGaramond.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <AppChrome
          navMode={user?.navMode ?? DEFAULT_NAV_MODE}
          screensaver={screensaver}
          startPage={user?.startPage}
          user={
            user && {
              displayName: user.displayName,
              avatarColor: user.avatarColor,
              role: user.role,
            }
          }
        >
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
