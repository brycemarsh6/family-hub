import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "../globals.css";
import { HubBottomNav } from "@/components/HubNav";
import { SignOutButton } from "@/components/SignOutButton";
import { getSession } from "@/lib/session";
// Same house-and-heart art used for the browser tab/home-screen icon
// (icon.png, apple-icon.png — see app-icons.md). Importing it here too means
// there's still only one icon file to ever replace, not a separate header
// logo asset drifting out of sync with it.
import appIcon from "../icon.png";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marsh HQ",
  description: "Shopping and inventory for the family.",
};

export const viewport: Viewport = {
  // `viewportFit: "cover"` lets us paint into the rounded corners on modern
  // phones; branches with their own bottom tab bar (like Kitchen) add
  // safe-area padding themselves to stay clear of the home indicator.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#17150f" },
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
  // Only to decide whether to show the Sign out button — this is not a
  // security check. The real protection lives in the DAL, next to the data
  // (see src/lib/dal.ts).
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3">
            <Link
              href="/"
              className="flex min-h-12 items-center gap-2 text-2xl font-semibold tracking-tight"
            >
              <Image
                src={appIcon}
                alt=""
                width={44}
                height={44}
                className="shrink-0"
                priority
              />
              Marsh HQ
            </Link>
            {session && <SignOutButton />}
          </div>
        </header>

        {/* pb-28 leaves room for the fixed bottom tab bar so the last row of
            a page is never trapped underneath it. */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">
          {children}
        </main>

        <HubBottomNav />
      </body>
    </html>
  );
}
