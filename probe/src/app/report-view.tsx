"use client";

import { useState } from "react";

type Finding = {
  id: string;
  severity: string;
  title: string;
  endpoint: string;
  expected: string;
  actual: string;
  repro: string[];
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
  summary: {
    agents: number;
    passed: number;
    failed: number;
    findings: number;
  };
  agents: AgentResult[];
};

function statusClass(status: string) {
  return status === "passed"
    ? "border-pass bg-pass-bg text-pass"
    : "border-fail bg-fail-bg text-fail";
}

export function ReportView({ initialReport }: { initialReport: Report | null }) {
  const [report, setReport] = useState(initialReport);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    try {
      const response = await fetch("/api/probes/run", { method: "POST" });
      const data = (await response.json()) as { ok?: boolean; error?: string; report?: Report };
      if (!response.ok || !data.ok || !data.report) {
        throw new Error(data.error ?? "Probe run failed");
      }
      setReport(data.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Probe run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-sheet disabled:opacity-60"
      >
        {running ? "Probes running" : "Run parallel probes"}
      </button>
      {error ? (
        <p className="basis-full text-sm text-fail" role="alert">
          {error}
        </p>
      ) : null}

      <section id="report" className="mt-10 w-full">
        <h2 className="text-2xl font-semibold">Latest breakage report</h2>
        {!report ? (
          <div className="mt-4 border-l-4 border-warn bg-warn-bg px-4 py-3" role="status">
            <p className="font-semibold text-warn">No report yet</p>
            <p className="mt-1 text-sm text-muted">Press Run parallel probes.</p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              Source: <span className="font-mono text-ink">{report.source}</span>
              {" · "}
              Generated: {new Date(report.generatedAt).toLocaleString()}
              {" · "}
              Target: {report.appBaseUrl}
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              <li className="border border-line bg-sheet p-4">
                <p className="text-sm text-muted">Agents</p>
                <p className="text-3xl font-semibold">{report.summary.agents}</p>
              </li>
              <li className="border border-line bg-sheet p-4">
                <p className="text-sm text-muted">Failed</p>
                <p className="text-3xl font-semibold text-fail">{report.summary.failed}</p>
              </li>
              <li className="border border-line bg-sheet p-4">
                <p className="text-sm text-muted">Findings</p>
                <p className="text-3xl font-semibold">{report.summary.findings}</p>
              </li>
            </ul>
            <div className="mt-6 space-y-4">
              {report.agents.map((agent) => (
                <article key={agent.id} className="border border-line bg-sheet p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xl font-semibold">{agent.name}</h3>
                    <p
                      className={`border px-2 py-1 text-sm uppercase tracking-wide ${statusClass(agent.status)}`}
                    >
                      {agent.status}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {agent.mode}
                    {agent.durationMs != null ? ` · ${agent.durationMs} ms` : ""}
                  </p>
                  {agent.findings.length === 0 ? (
                    <p className="mt-3 text-pass">No breakages in this lane.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {agent.findings.map((finding) => (
                        <li key={finding.id} className="border-l-4 border-fail bg-fail-bg px-3 py-2">
                          <p className="font-semibold">
                            {finding.id}: {finding.title}
                          </p>
                          <p className="mt-1 text-sm">
                            Severity: {finding.severity} · {finding.endpoint}
                          </p>
                          <p className="mt-1 text-sm">Expected: {finding.expected}</p>
                          <p className="text-sm">Actual: {finding.actual}</p>
                          <ol className="mt-2 list-decimal pl-5 text-sm text-muted">
                            {finding.repro.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
