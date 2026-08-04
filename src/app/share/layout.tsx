import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

// The second root layout in the project (the other is src/app/(app)/layout.tsx).
//
// A shared recipe is read by someone outside the household — no session, no
// account, often on a phone, possibly printed. So this deliberately has
// none of the app's chrome: no header, no sign-out button, no bottom tab
// bar, and critically no getSession() call, since there's no session to
// read and nothing here should behave differently based on whether the
// reader happens to also be a family member.
//
// Next.js's documented way to give a subtree a genuinely separate
// <html>/<body> is multiple root layouts via route groups — not a
// conditional inside one shared layout — which is why the authenticated
// app moved into an (app) group when this was added.

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shared recipe",
  // Shared links shouldn't end up indexed — the token is the only thing
  // keeping a recipe private, and a search engine following one into its
  // index would undo that.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#17150f" },
  ],
};

export default function ShareLayout({
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
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
