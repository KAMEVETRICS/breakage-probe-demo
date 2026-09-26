import { NextResponse } from "next/server";

const CATALOG = [
  { id: "sku-1", name: "Trail Flask", category: "gear", price: 24 },
  { id: "sku-2", name: "Camp Mug", category: "kitchen", price: 18 },
  { id: "sku-3", name: "Ridge Jacket", category: "gear", price: 120 },
  { id: "sku-4", name: "Spice Kit", category: "kitchen", price: 32 },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const category = searchParams.get("category");

  // Planted bug: category filter is read and then ignored.
  void category;

  const results = CATALOG.filter((item) =>
    q ? item.name.toLowerCase().includes(q) : true,
  );

  return NextResponse.json({
    q,
    category,
    count: results.length,
    results,
  });
}
