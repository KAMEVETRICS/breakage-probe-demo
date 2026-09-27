import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteNav } from "./site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Breakage Probe",
  description:
    "Parallel agent workflow that rehearses an app until something breaks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold text-ink no-underline">
              <span aria-hidden="true" className="grid size-7 place-items-center bg-accent font-mono text-sm text-paper">
                BP
              </span>
              Breakage Probe
            </Link>
            <Suspense
              fallback={
                <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Main">
                  <Link href="/" className="inline-flex min-h-11 items-center">
                    Dashboard
                  </Link>
                  <Link href="/demo" className="inline-flex min-h-11 items-center">
                    Demo app
                  </Link>
                </nav>
              }
            >
              <SiteNav />
            </Suspense>
          </div>
        </header>
        <Suspense>
          <div className="flex flex-1 flex-col">{children}</div>
        </Suspense>
      </body>
    </html>
  );
}
