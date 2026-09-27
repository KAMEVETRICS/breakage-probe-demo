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

const BOB_STEPS = [
  {
    title: "Load the skill",
    body: (
      <>
        Bob reads <code className="font-mono text-ink">skills/breakage-probe/SKILL.md</code>: three
        probes, the request each sends, and the answer each expects.
      </>
    ),
  },
  {
    title: "Spawn three subagents",
    body: <>Cart, Auth, and Search run in parallel against the running app, not one after another.</>,
  },
  {
    title: "Name the file",
    body: (
      <>
        Bob writes <code className="font-mono text-ink">reports/breakage-latest.json</code> and points at
        the route behind each failure. This page reads that report.
      </>
    ),
  },
];

export default async function Home() {
  const report = await loadReport();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        IBM Bob 2.0 · parallel subagents
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
        A 200 is not a pass. Probe the answer.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Three probes hit the cart, login, and search at the same time. Each one knows the right answer,
        so a quiet wrong result shows up in red with the value it should have been.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="#report"
          className="inline-flex min-h-11 items-center border border-accent bg-accent px-4 font-semibold text-paper no-underline"
        >
          Go to the probes
        </a>
        <FixLink
          href="/demo"
          className="inline-flex min-h-11 items-center border border-line bg-sheet px-4 text-ink no-underline hover:border-muted"
        >
          Open the storefront
        </FixLink>
      </div>

      <ReportView initialReport={report} />

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Run it with IBM Bob</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {BOB_STEPS.map((step, index) => (
            <li key={step.title} className="border border-line bg-sheet p-4">
              <p className="font-mono text-sm text-accent">0{index + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">
          Locally: <code className="font-mono text-ink">npm run dev</code>, then open the{" "}
          <code className="font-mono text-ink">probe</code> folder in Bob IDE and ask it to follow the skill.
          Or run <code className="font-mono text-ink">npm run probe</code> for the same three checks from a terminal.
        </p>
      </section>

      <details className="group mt-12 border border-line bg-sheet">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 text-lg font-semibold">
          Extra: read a page and the links on it
          <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="border-t border-line px-4 pb-4">
          <ResearchPanel />
        </div>
      </details>
    </main>
  );
}
