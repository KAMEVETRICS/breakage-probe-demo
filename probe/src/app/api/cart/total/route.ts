import { NextResponse } from "next/server";

type CartItem = {
  id: string;
  price: number;
  qty: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as { items?: CartItem[] };
  const items = body.items ?? [];

  // Planted bug: quantity is ignored, so multi-qty carts undercharge.
  const total = items.reduce((sum, item) => sum + Number(item.price), 0);

  return NextResponse.json({
    total,
    currency: "USD",
    itemCount: items.length,
  });
}
