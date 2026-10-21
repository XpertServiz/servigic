import { NextResponse } from "next/server";
import { priceGuideFor } from "@/lib/priceGuide";

// Public: the realistic price range for a service in a city, in that city's currency (see src/lib/priceGuide.ts).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const city = searchParams.get("city");
  if (!categoryId || !city) return NextResponse.json({ error: "categoryId and city are required" }, { status: 400 });
  const guide = await priceGuideFor(categoryId, city);
  return NextResponse.json({ guide }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=600" } });
}
