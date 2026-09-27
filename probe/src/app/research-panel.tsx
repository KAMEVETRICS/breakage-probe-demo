"use client";

import { useState } from "react";

type PageNote = {
  url: string;
  status: number;
  title: string;
  snippet: string;
};

type ResearchReport = {
  main: PageNote;
  linked: PageNote[];
  skipped: string[];
};

export function ResearchPanel() {
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ResearchReport | null>(null);

  async function run() {
    setRunning(true);
    setError("");
    try {
      const target = url.trim() || window.location.origin;
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        report?: ResearchReport;
      };
      if (!response.ok || !data.ok || !data.report) {
        throw new Error(data.error ?? "Research failed");
      }
      setReport(data.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Research failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mt-10 border border-line bg-sheet p-4">
      <h2 className="text-2xl font-semibold">Read a page and the links on it</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        One agent reads the URL you send. The others read only the links written on that page, and only when the link stays on the same host. Links to other sites are listed and left unread.
      </p>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
      >
        <label className="block min-w-64 flex-1 text-sm">
          URL
          <input
            className="mt-1 w-full border border-line bg-paper px-2 py-2"
            value={url}
            placeholder="Leave blank to read this site"
            onChange={(event) => setUrl(event.target.value)}
            inputMode="url"
          />
        </label>
        <button
          type="submit"
          disabled={running}
          className="inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-sheet disabled:opacity-60"
        >
          {running ? "Reading" : "Read page and links"}
        </button>
      </form>
      {error ? (
        <p className="mt-3 text-sm text-fail" role="alert">
          {error}
        </p>
      ) : null}
      {report ? (
        <div className="mt-4 space-y-3">
          <PageRow label="Main page" page={report.main} />
          {report.linked.map((page) => (
            <PageRow key={page.url} label="Linked page" page={page} />
          ))}
          {report.skipped.length > 0 ? (
            <p className="text-sm text-muted">Left unread: {report.skipped.join(", ")}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PageRow({ label, page }: { label: string; page: PageNote }) {
  return (
    <article className="border border-line p-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-semibold">
        {page.status} {page.title || page.url}
      </p>
      <p className="mt-1 break-all font-mono text-sm">{page.url}</p>
      {page.snippet ? <p className="mt-2 text-sm">{page.snippet}</p> : null}
    </article>
  );
}
