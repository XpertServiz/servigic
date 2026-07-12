import { NextResponse } from "next/server";
import { verifyOtpSchema } from "@/lib/validation/auth";
import { verifyOtp } from "@/lib/otp";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }
  const ok = await verifyOtp(parsed.data.userId, parsed.data.code);
  if (!ok) {
    return NextResponse.json({ error: "Code is invalid or expired" }, { status: 400 });
  }
  return NextResponse.json({ verified: true });
}
