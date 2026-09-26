import { NextResponse } from "next/server";

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

function baseUrlFrom(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://127.0.0.1:3000";
  return `${proto}://${host}`;
}

function probeHeaders(fixes: string[]) {
  return {
    "Content-Type": "application/json",
    "x-probe-fixes": fixes.join(","),
  };
}

async function probeCart(baseUrl: string, fixes: string[]): Promise<AgentResult> {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/api/cart/total`, {
    method: "POST",
    headers: probeHeaders(fixes),
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

async function probeAuth(baseUrl: string, fixes: string[]): Promise<AgentResult> {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: probeHeaders(fixes),
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

async function probeSearch(baseUrl: string, fixes: string[]): Promise<AgentResult> {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/api/search?q=&category=kitchen`, {
    headers: probeHeaders(fixes),
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
    const fixes = Array.isArray(body.fixes)
      ? body.fixes.filter((item): item is string => typeof item === "string")
      : [];
    const baseUrl = baseUrlFrom(request);
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
