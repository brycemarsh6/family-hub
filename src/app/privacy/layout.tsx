import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "../globals.css";

// A public page for anyone, signed in or not (Google's reviewers included).
// Like src/app/share/layout.tsx it is its own root layout with no app chrome
// and no session read. Unlike the share pages it may be indexed: Google
// needs to be able to fetch it.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Marshee privacy policy",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b16" },
  ],
};

export default function PrivacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
