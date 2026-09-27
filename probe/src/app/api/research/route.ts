import { NextResponse } from "next/server";
import { allowedTarget, readResearch } from "../../../research";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: unknown };
  if (typeof body.url !== "string" || body.url.trim() === "") {
    return NextResponse.json({ ok: false, error: "Send a URL." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(body.url.trim());
  } catch {
    return NextResponse.json({ ok: false, error: "That URL is not valid." }, { status: 400 });
  }

  const ownHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (!allowedTarget(target, ownHost)) {
    return NextResponse.json(
      { ok: false, error: "That host is not available for research." },
      { status: 400 },
    );
  }

  try {
    const report = await readResearch(target.toString());
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
