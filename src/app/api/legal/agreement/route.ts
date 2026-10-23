import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAgreement } from "@/lib/legal/agreements";

// Public: the Customer Terms or Pro Agreement for a country (?role=CUSTOMER|PROVIDER&country=SA). Without a country, the
// visitor's IP country is used. Sign-up screens show this and send back its version + hash with the e-signature.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
  const h = await headers();
  const country = searchParams.get("country") || h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "XX";
  return NextResponse.json({ agreement: getAgreement(role, country) }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
}
