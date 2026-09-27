import { readFile } from "node:fs/promises";
import path from "node:path";
import { FixLink } from "./fix-link";
import { ReportView, type Report } from "./report-view";
import { ResearchPanel } from "./research-panel";

export const dynamic = "force-dynamic";

async function loadReport(): Promise<Report | null> {
  try {
    const filePath = path.join(process.cwd(), "reports", "breakage-latest.json");
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as Report;
  } catch {
    return null;
  }
}

export default async function Home() {
  const report = await loadReport();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <p className="text-sm uppercase tracking-wide text-muted">IBM Bob 2.0 hackathon</p>
      <h1 className="mt-1 max-w-3xl text-4xl font-semibold leading-tight">
        Parallel agents that rehearse your app until something breaks.
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Breakage Probe gives Bob three concurrent jobs: cart, auth, and search.
        Findings land in a report the dashboard reads. The demo storefront below
        contains the planted functional bugs.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <FixLink
          href="/demo"
          className="inline-flex min-h-11 items-center border border-accent bg-accent px-4 text-sheet no-underline"
        >
          Open demo app
        </FixLink>
        <a
          href="#report"
          className="inline-flex min-h-11 items-center border border-ink px-4 text-ink no-underline"
        >
          Jump to report
        </a>
      </div>

      <section className="mt-10 border border-line bg-sheet p-4">
        <h2 className="text-2xl font-semibold">How Bob should run this</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
          <li>Start the app with <code className="font-mono text-ink">npm.cmd run dev</code>.</li>
          <li>
            In Bob IDE, open this <code className="font-mono text-ink">probe</code> folder and
            follow <code className="font-mono text-ink">skills/breakage-probe/SKILL.md</code>.
          </li>
          <li>Press Run parallel probes. The page shows the result for this deployment.</li>
        </ol>
      </section>

      <ReportView initialReport={report} />
      <ResearchPanel />
    </main>
  );
}
