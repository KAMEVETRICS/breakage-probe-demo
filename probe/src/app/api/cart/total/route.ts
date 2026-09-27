import { NextResponse } from "next/server";
import { hasFix } from "../../../../fixes";

type CartItem = {
  id: string;
  price: number;
  qty: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as { items?: CartItem[] };
  const items = body.items ?? [];
  const fixed = hasFix(request, "cart");

  const total = items.reduce(
    (sum, item) => sum + (fixed ? Number(item.price) * Number(item.qty) : Number(item.price)),
    0,
  );

  return NextResponse.json({
    total,
    currency: "USD",
    itemCount: items.length,
  });
}
