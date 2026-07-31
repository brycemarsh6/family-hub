import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marsh Hub",
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

// This layout wraps every page in the app, dashboard and branches alike: just
// the logo bar and the page itself. Each branch (Kitchen, and later Calendar,
// Chores, Lists...) adds its own nav on top of this via its own layout.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
              className="flex min-h-12 items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <span aria-hidden="true">🏡</span>
              Marsh Hub
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4">{children}</main>
      </body>
    </html>
  );
}
