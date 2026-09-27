"use client";

import { useState } from "react";
import { FIX_IDS, FIX_LABELS } from "../fixes";
import { useFixes } from "./use-fixes";

type Finding = {
  id: string;
  severity: string;
  title: string;
  endpoint: string;
  expected: string;
  actual: string;
  repro: string[];
  file?: string;
};

type AgentResult = {
  id: string;
  name: string;
  mode: string;
  status: string;
  durationMs: number | null;
  findings: Finding[];
};

export type Report = {
  generatedAt: string;
  source: string;
  appBaseUrl: string;
  fixes?: string[];
  summary: {
    agents: number;
    passed: number;
    failed: number;
    findings: number;
  };
  agents: AgentResult[];
};

// What each lane checks, shown whether it passes or fails.
const LANES: Record<string, { label: string; request: string; expect: string; file: string }> = {
  "cart-probe": {
    label: "Cart total",
    request: "POST /api/cart/total · 2 × $10 + 1 × $15",
    expect: "total 35",
    file: "src/app/api/cart/total/route.ts",
  },
  "auth-probe": {
    label: "Login",
    request: "POST /api/auth/login · password “ship”",
    expect: "rejected (401)",
    file: "src/app/api/auth/login/route.ts",
  },
  "search-probe": {
    label: "Category search",
    request: "GET /api/search?category=kitchen",
    expect: "2 kitchen items",
    file: "src/app/api/search/route.ts",
  },
};

const MIN_RUN_MS = 900;

function laneChange(before: Report | null, after: Report | null, id: string) {
  const previous = before?.agents.find((agent) => agent.id === id);
  const current = after?.agents.find((agent) => agent.id === id);
  if (!previous || !current || previous.status === current.status) return "";
  return current.status === "passed" ? "Now passing" : "Now failing";
}

export function ReportView({ initialReport }: { initialReport: Report | null }) {
  const { fixes, toggle } = useFixes();
  const [report, setReport] = useState(initialReport);
  const [previous, setPrevious] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    try {
      // Keep the lanes visibly "running" for a moment even when the app answers instantly.
      const [response] = await Promise.all([
        fetch("/api/probes/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fixes }),
        }),
        new Promise((resolve) => setTimeout(resolve, MIN_RUN_MS)),
      ]);
      const data = (await response.json()) as { ok?: boolean; error?: string; report?: Report };
      if (!response.ok || !data.ok || !data.report) {
        throw new Error(data.error ?? "Probe run failed");
      }
      setPrevious(report);
      setReport(data.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Probe run failed");
    } finally {
      setRunning(false);
    }
  }

  const agents = report?.agents ?? [];
  const laneIds = agents.length > 0 ? agents.map((agent) => agent.id) : Object.keys(LANES);

  return (
    <section id="report" className="mt-8 w-full scroll-mt-20">
      <div className="flex flex-col gap-4 border border-line bg-sheet p-4 sm:flex-row sm:items-center sm:justify-between">
        <fieldset className="min-w-0">
          <legend className="text-xs font-semibold uppercase tracking-widest text-muted">
            Fixes applied to the app
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {FIX_IDS.map((id) => {
              const on = fixes.includes(id);
              return (
                <label
                  key={id}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-2 border px-3 text-sm transition-colors ${
                    on ? "border-pass bg-pass-bg text-pass" : "border-line bg-raised text-ink hover:border-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--pass)]"
                    checked={on}
                    onChange={() => toggle(id)}
                  />
                  {FIX_LABELS[id]}
                </label>
              );
            })}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 bg-accent px-6 text-base font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-70"
        >
          <span aria-hidden="true">{running ? "◌" : "▶"}</span>
          {running ? "Probes running…" : "Run parallel probes"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 border-l-4 border-fail bg-fail-bg px-3 py-2 text-sm text-fail" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-2xl font-semibold">Probe lanes</h2>
        {report ? (
          <p className="text-sm text-muted" aria-live="polite">
            <span className={report.summary.failed > 0 ? "font-semibold text-fail" : "font-semibold text-pass"}>
              {report.summary.failed > 0
                ? `${report.summary.failed} of ${report.summary.agents} failing`
                : `All ${report.summary.agents} passing`}
            </span>
            {" · "}
            {report.source === "bob-parallel-subagents" ? "written by IBM Bob’s subagents" : "run from this page"}
            {" · "}
            {new Date(report.generatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      {!report && !running ? (
        <p className="mt-3 text-sm text-muted">No report yet. Press Run parallel probes.</p>
      ) : null}

      <ul className="mt-4 grid gap-4 lg:grid-cols-3">
        {laneIds.map((id) => {
          const agent = agents.find((item) => item.id === id);
          const lane = LANES[id];
          const finding = agent?.findings[0];
          const passed = agent?.status === "passed";
          const change = laneChange(previous, report, id);
          const bar = running ? "bg-accent" : !agent ? "bg-line" : passed ? "bg-pass" : "bg-fail";
          return (
            <li
              key={id}
              className={`flex flex-col border border-line bg-sheet p-4 ${running ? "probe-scan" : ""}`}
            >
              <div aria-hidden="true" className={`-mx-4 -mt-4 mb-4 h-1 ${bar}`} />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted">{agent?.name ?? id}</p>
                  <h3 className="mt-1 text-xl font-semibold">{lane?.label ?? agent?.name}</h3>
                </div>
                <p
                  className={`shrink-0 border px-2 py-1 text-xs font-semibold uppercase tracking-widest ${
                    running
                      ? "border-accent text-accent"
                      : passed
                        ? "border-pass bg-pass-bg text-pass"
                        : agent
                          ? "border-fail bg-fail-bg text-fail"
                          : "border-line text-muted"
                  }`}
                >
                  {running ? "Running" : agent ? (passed ? "Pass" : "Fail") : "Idle"}
                </p>
              </div>

              {lane ? <p className="mt-2 font-mono text-xs text-muted">{lane.request}</p> : null}

              <dl className="mt-4 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-2">
                <dt className="text-xs uppercase tracking-widest text-muted">Expected</dt>
                <dd className="font-mono text-lg">{lane?.expect ?? finding?.expected ?? "—"}</dd>
                <dt className="text-xs uppercase tracking-widest text-muted">Got</dt>
                <dd
                  className={`font-mono text-lg font-semibold ${
                    running ? "text-muted" : passed ? "text-pass" : agent ? "text-fail" : "text-muted"
                  }`}
                >
                  {running ? "…" : !agent ? "—" : passed ? "as expected" : (finding?.actual ?? "wrong result")}
                </dd>
              </dl>

              {!running && change ? (
                <p className={`mt-3 text-sm font-semibold ${passed ? "text-pass" : "text-fail"}`}>{change}</p>
              ) : null}

              {!running && finding ? (
                <div className="mt-4 border-t border-line pt-3 text-sm">
                  <p className="font-semibold">
                    {finding.id} · {finding.title}
                  </p>
                  <p className="mt-1 text-muted">
                    Severity {finding.severity} · <span className="font-mono">{finding.file ?? lane?.file}</span>
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-muted hover:text-ink">Steps to repeat</summary>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                      {finding.repro.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </details>
                </div>
              ) : null}

              {agent?.durationMs != null && !running ? (
                <p className="mt-auto pt-3 text-xs text-muted">{agent.durationMs} ms</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
