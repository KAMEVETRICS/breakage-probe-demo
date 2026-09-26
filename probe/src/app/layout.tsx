import type { Metadata } from "next";
import Link from "next/link";
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
        <header className="border-b border-line bg-sheet">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-ink no-underline">
              Breakage Probe
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Main">
              <Link href="/" className="inline-flex min-h-11 items-center">
                Dashboard
              </Link>
              <Link href="/demo" className="inline-flex min-h-11 items-center">
                Demo app
              </Link>
              <a
                href="https://lablab-ibm-bob-2-hackathon-guide.s3.us.cloud-object-storage.appdomain.cloud/index.html"
                className="inline-flex min-h-11 items-center"
              >
                Hackathon guide
              </a>
            </nav>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
