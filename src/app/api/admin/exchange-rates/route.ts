import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const CURRENCIES = ["USD", "CAD", "EUR", "PLN", "SAR", "AED", "QAR"] as const;
const schema = z.object({ currency: z.enum(CURRENCIES), ratePerPKR: z.number().positive() });

export async function PUT(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const rate = await prisma.exchangeRate.upsert({
    where: { currency: parsed.data.currency },
    update: { ratePerPKR: parsed.data.ratePerPKR },
    create: parsed.data,
  });
  revalidateTag("exchange-rates", "max");

  return NextResponse.json({ rate });
}
