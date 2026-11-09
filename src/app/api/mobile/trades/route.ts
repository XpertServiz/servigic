import { NextResponse } from "next/server";
import { getCategoryList } from "@/lib/publicData";

// Public (works before sign-in, e.g. on the Pro sign-up screen): the names and icons of the categories, so a category an admin
// created (Admin > Categories) shows up in the apps by its own name. Cached for 5 minutes.
export async function GET() {
  const rows = await getCategoryList().catch(() => []);
  return NextResponse.json({ trades: rows.map((r) => ({ trade: r.trade, name: r.name, icon: r.icon })) }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
