import { NextResponse } from "next/server";
import { type FixId, fixHeaders, parseFixes } from "../../../../fixes";

export const dynamic = "force-dynamic";

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
  mode: "parallel-subagent";
  status: "passed" | "failed";
  durationMs: number;
  findings: Finding[];
};

// The Host header is client-controlled, so only probe this deployment's own
// Vercel hostnames, or loopback in local dev. Anything else would let a caller
// point the server's requests at a host of their choosing.
const OWN_HOSTS = new Set(
  [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL,
  ].filter((host): host is string => Boolean(host)),
);

function baseUrlFrom(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return "http://127.0.0.1:3000";
  if (OWN_HOSTS.has(host)) return `https://${host}`;
  const name = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  if (name === "localhost" || name === "127.0.0.1" || name === "::1") return `http://${host}`;
  return null;
}

async function probeCart(baseUrl: string, fixes: FixId[]): Promise<AgentResult> {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/api/cart/total`, {
    method: "POST",
    headers: fixHeaders(fixes),
    body: JSON.stringify({
      items: [
        { id: "1", price: 10, qty: 2 },
        { id: "2", price: 15, qty: 1 },
      ],
    }),
  });
  const data = (await response.json()) as { total?: number };
  const failed = data.total !== 35;
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
              "POST /api/cart/total with { items: [{price:10,qty:2},{price:15,qty:1}] }",
              `Observe total === ${data.total} instead of 35`,
            ],
          },
        ]
      : [],
  };
}

async function probeAuth(baseUrl: string, fixes: FixId[]): Promise<AgentResult> {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: fixHeaders(fixes),
    body: JSON.stringify({ email: "buyer@demo.test", password: "ship" }),
  });
  const data = (await response.json()) as { ok?: boolean };
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
            actual: "password ship returned ok:true",
            repro: [
              "POST /api/auth/login with email buyer@demo.test and password ship",
              "Observe 200 with ok:true",
            ],
          },
        ]
      : [],
  };
}

async function probeSearch(baseUrl: string, fixes: FixId[]): Promise<AgentResult> {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/api/search?q=&category=kitchen`, {
    headers: fixHeaders(fixes),
  });
  const data = (await response.json()) as {
    count?: number;
    results?: { category: string }[];
  };
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

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { fixes?: unknown };
    const fixes = parseFixes(body.fixes);
    const baseUrl = baseUrlFrom(request);
    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, error: "Probes only run against this app's own host." },
        { status: 400 },
      );
    }
    const agents = await Promise.all([
      probeCart(baseUrl, fixes),
      probeAuth(baseUrl, fixes),
      probeSearch(baseUrl, fixes),
    ]);
    const findings = agents.reduce((sum, agent) => sum + agent.findings.length, 0);
    const failed = agents.filter((agent) => agent.status === "failed").length;
    return NextResponse.json({
      ok: true,
      report: {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        source: "api/probes/run",
        appBaseUrl: baseUrl,
        fixes,
        summary: {
          agents: agents.length,
          passed: agents.length - failed,
          failed,
          findings,
        },
        agents,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Probe run failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
