import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.PROBE_BASE_URL ?? "http://127.0.0.1:3000";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function probeCart() {
  const started = Date.now();
  const items = [
    { id: "1", price: 10, qty: 2 },
    { id: "2", price: 15, qty: 1 },
  ];
  const expected = 35;
  const response = await fetch(`${baseUrl}/api/cart/total`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const data = await response.json();
  const failed = data.total !== expected;
  return {
    id: "cart-probe",
    name: "Cart Probe",
    mode: "parallel-subagent",
    status: failed ? "failed" : "passed",
    durationMs: Date.now() - started,
    findings: failed
      ? [
          {
            id: "CART-001",
            severity: "high",
            title: "Cart total ignores quantity",
            endpoint: "POST /api/cart/total",
            expected: "2×$10 + 1×$15 = $35",
            actual: `total returned ${data.total}`,
            repro: [
              "POST /api/cart/total with items [{price:10,qty:2},{price:15,qty:1}]",
              `Observe total === ${data.total} instead of 35`,
            ],
          },
        ]
      : [],
  };
}

async function probeAuth() {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "buyer@demo.test", password: "ship" }),
  });
  const data = await response.json();
  const failed = data.ok === true;
  return {
    id: "auth-probe",
    name: "Auth Probe",
    mode: "parallel-subagent",
    status: failed ? "failed" : "passed",
    durationMs: Date.now() - started,
    findings: failed
      ? [
          {
            id: "AUTH-001",
            severity: "critical",
            title: "Partial password is accepted",
            endpoint: "POST /api/auth/login",
            expected: "Only the full password shipit-now should authenticate",
            actual: "password 'ship' returned ok:true",
            repro: [
              "POST /api/auth/login with email buyer@demo.test and password ship",
              "Observe 200 with ok:true",
            ],
          },
        ]
      : [],
  };
}

async function probeSearch() {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/api/search?q=&category=kitchen`);
  const data = await response.json();
  const kitchenOnly =
    Array.isArray(data.results) &&
    data.results.length === 2 &&
    data.results.every((item) => item.category === "kitchen");
  const failed = !kitchenOnly;
  return {
    id: "search-probe",
    name: "Search Probe",
    mode: "parallel-subagent",
    status: failed ? "failed" : "passed",
    durationMs: Date.now() - started,
    findings: failed
      ? [
          {
            id: "SEARCH-001",
            severity: "medium",
            title: "Category filter is ignored",
            endpoint: "GET /api/search",
            expected: "category=kitchen returns 2 kitchen items",
            actual: `returned ${data.count ?? data.results?.length ?? 0} items`,
            repro: [
              "GET /api/search?q=&category=kitchen",
              "Observe gear items present or count !== 2",
            ],
          },
        ]
      : [],
  };
}

const agents = await Promise.all([probeCart(), probeAuth(), probeSearch()]);
const findings = agents.reduce((sum, agent) => sum + agent.findings.length, 0);
const failed = agents.filter((agent) => agent.status === "failed").length;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "probes/run-all.mjs",
  appBaseUrl: baseUrl,
  summary: {
    agents: agents.length,
    passed: agents.length - failed,
    failed,
    findings,
  },
  agents,
};

const reportsDir = path.join(root, "reports");
await mkdir(reportsDir, { recursive: true });
const out = path.join(reportsDir, "breakage-latest.json");
await writeFile(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote ${out}`);
console.log(
  `Agents: ${report.summary.agents}, failed: ${report.summary.failed}, findings: ${report.summary.findings}`,
);
await new Promise((resolve) => setTimeout(resolve, 50));
