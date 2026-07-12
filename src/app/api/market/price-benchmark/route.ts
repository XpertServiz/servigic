import { NextResponse } from "next/server";
import { getPriceBenchmark } from "@/lib/priceBenchmark";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const city = searchParams.get("city");
  const subServiceId = searchParams.get("subServiceId");

  if (!categoryId || !city) {
    return NextResponse.json({ error: "categoryId and city are required" }, { status: 400 });
  }

  const benchmark = await getPriceBenchmark(categoryId, city, subServiceId);
  return NextResponse.json({ benchmark });
}
