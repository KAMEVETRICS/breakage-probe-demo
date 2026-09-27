import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.PROBE_BASE_URL ?? "http://127.0.0.1:3000";
const fixes = (process.env.PROBE_FIXES ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const response = await fetch(`${baseUrl}/api/probes/run`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ fixes }),
});
const data = await response.json();

if (!response.ok || !data.report) {
  console.error(data.error ?? `Probe request failed (${response.status})`);
  process.exitCode = 1;
} else {
  const reportsDir = path.join(root, "reports");
  await mkdir(reportsDir, { recursive: true });
  const out = path.join(reportsDir, "breakage-latest.json");
  await writeFile(out, `${JSON.stringify(data.report, null, 2)}\n`);
  console.log(`Wrote ${out}`);
  console.log(
    `failed: ${data.report.summary.failed}, findings: ${data.report.summary.findings}`,
  );
}
