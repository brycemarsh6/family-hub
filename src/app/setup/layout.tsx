import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Cormorant_Garamond } from "next/font/google";
import "../globals.css";

// A relative's first-run setup page. Like src/app/privacy/layout.tsx it is its
// own root layout: no app chrome, no session read, and (on purpose) no
// loading.tsx beside it, so the page's notFound() lands before anything
// streams and a closed /setup answers a real 404, not a 200 with a not-found
// screen. Same three brand faces as the (app) layout; the tagline uses
// font-accent, which needs Cormorant Garamond.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-accent-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Set up Marshee",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b16" },
  ],
};

export default function SetupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${cormorantGaramond.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </body>
    </html>
  );
}
