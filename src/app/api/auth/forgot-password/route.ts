import { NextResponse } from "next/server";
import { z } from "zod";
import { issueOtp } from "@/lib/otp";
import { findAccountsByPhone } from "@/lib/accounts";
import { toE164 } from "@/lib/phone";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";

// Step 1 of "Forgot password": send a code to the number's WhatsApp / SMS (and email when the account has one).
// The answer is always the same, so nobody can use this to find out which numbers are registered.
const schema = z.object({ phone: z.string().trim().min(5).max(30), country: z.string().trim().length(2).optional() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your phone number.", code: "INVALID_INPUT" }, { status: 400 });
  const phone = toE164(parsed.data.phone, ((parsed.data.country ?? "PK").toUpperCase() as never) ?? "PK") ?? parsed.data.phone;

  const ip = await checkRateLimit(`forgot-ip:${clientKey(req)}`, 10, 3600);
  const num = await checkRateLimit(`forgot:${phone}`, 4, 3600);
  if (!ip.ok || !num.ok) return NextResponse.json({ error: "Too many requests. Please wait a while and try again.", code: "RATE_LIMITED" }, { status: 429 });

  const accounts = await findAccountsByPhone(phone);
  // One code is enough: resetting changes the password of every account on this number (same person).
  const target = accounts.find((u) => u.role === "CUSTOMER" || u.role === "PROVIDER") ?? accounts[0];
  if (target) {
    const email = accounts.find((u) => u.email)?.email ?? null;
    await issueOtp(target.id, target.phone, "PASSWORD_RESET", email).catch((e) => console.error("[forgot]", e));
  }
  return NextResponse.json({ sent: true });
}
