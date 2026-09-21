import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";

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
  title: { default: "kubute", template: "%s · kubute" },
  description: "Live quizzes, in real time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 text-sm text-muted">
            <span>kubute</span>
            <Link href="/status" className="hover:text-foreground">
              Status
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
