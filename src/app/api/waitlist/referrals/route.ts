import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// "You have referred N people": how many signups used this person's code. Only a number is returned.
export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("code") || "").toUpperCase();
  if (!/^WL[A-Z0-9]{6}$/.test(code)) return NextResponse.json({ count: 0 });
  const count = await prisma.waitlistSignup.count({ where: { referredByCode: code } });
  return NextResponse.json({ count });
}
