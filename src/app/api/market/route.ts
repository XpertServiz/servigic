import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({ country: z.string().length(2) });

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid country" }, { status: 400 });

  const cookieStore = await cookies();
  cookieStore.set("servigic_country", parsed.data.country.toUpperCase(), { path: "/", maxAge: 60 * 60 * 24 * 365 });

  return NextResponse.json({ ok: true });
}
