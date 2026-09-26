import { NextResponse } from "next/server";

const ACCOUNT = {
  email: "buyer@demo.test",
  password: "shipit-now",
};

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  // Planted bug: any password prefix of length >= 4 unlocks the account.
  const accepted =
    email === ACCOUNT.email &&
    password.length >= 4 &&
    ACCOUNT.password.startsWith(password);

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
