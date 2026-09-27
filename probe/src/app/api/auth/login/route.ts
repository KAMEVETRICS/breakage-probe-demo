import { NextResponse } from "next/server";
import { hasFix } from "../../../../fixes";

const ACCOUNT = {
  email: "buyer@demo.test",
  password: "shipit-now",
};

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const fixed = hasFix(request, "auth");

  const accepted =
    email === ACCOUNT.email &&
    (fixed
      ? password === ACCOUNT.password
      : password.length >= 4 && ACCOUNT.password.startsWith(password));

  if (!accepted) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: { email: ACCOUNT.email, role: "buyer" },
  });
}
