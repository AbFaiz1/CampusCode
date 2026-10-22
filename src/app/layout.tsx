import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CampusCode — College competitive programming network",
    template: "%s · CampusCode",
  },
  description:
    "CampusCode unifies your Codeforces, LeetCode, CodeChef and AtCoder profiles into one college leaderboard, class tier and contest calendar.",
  keywords: [
    "competitive programming",
    "college leaderboard",
    "Codeforces",
    "LeetCode",
    "CodeChef",
    "AtCoder",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-surface/40">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              CampusCode — a college competitive programming network. Not affiliated with
              Codeforces, LeetCode, CodeChef or AtCoder.
            </p>
            <p className="flex gap-4">
              <a href="/methodology" className="hover:text-ink-muted">
                Scoring methodology
              </a>
              <a href="/methodology#privacy" className="hover:text-ink-muted">
                Privacy
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
