export const FIX_IDS = ["cart", "auth", "search"] as const;

export type FixId = (typeof FIX_IDS)[number];

export const FIX_LABELS: Record<FixId, string> = {
  cart: "Fix cart total",
  auth: "Fix login",
  search: "Fix search filter",
};

const FIX_HEADER = "x-probe-fixes";

const FIX_SET = new Set<string>(FIX_IDS);

export function parseFixes(value: unknown): FixId[] {
  const parts = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const chosen = new Set<FixId>();
  for (const part of parts) {
    if (typeof part === "string" && FIX_SET.has(part)) chosen.add(part as FixId);
  }
  return FIX_IDS.filter((id) => chosen.has(id));
}

export function serializeFixes(fixes: readonly FixId[]) {
  return parseFixes([...fixes]).join(",");
}

export function hasFix(request: Request, id: FixId) {
  return parseFixes(request.headers.get(FIX_HEADER)).includes(id);
}

export function fixHeaders(fixes: readonly FixId[]): HeadersInit {
  return {
    "Content-Type": "application/json",
    [FIX_HEADER]: serializeFixes(fixes),
  };
}

export function hrefWithFixes(path: string, fixes: readonly FixId[]) {
  const query = serializeFixes(fixes);
  return query ? `${path}?fixes=${query}` : path;
}
