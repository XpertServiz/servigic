import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { postJournalEntry, UnbalancedJournalEntryError } from "@/lib/accounting/postJournalEntry";

const lineSchema = z.object({
  accountCode: z.string().min(1),
  debitPKR: z.number().int().min(0).default(0),
  creditPKR: z.number().int().min(0).default(0),
});

const createSchema = z.object({
  date: z.string().datetime().optional(),
  memo: z.string().trim().min(3).max(200),
  lines: z.array(lineSchema).min(2, "A journal entry needs at least two lines"),
});

export async function GET(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Number(searchParams.get("limit")) || 50);

  const entries = await prisma.journalEntry.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: { lines: { include: { account: true } }, createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  try {
    const entry = await postJournalEntry({
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
      memo: parsed.data.memo,
      source: "MANUAL",
      createdById: auth.session.user.id,
      lines: parsed.data.lines,
    });
    return NextResponse.json({ entry });
  } catch (e) {
    if (e instanceof UnbalancedJournalEntryError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to post entry" }, { status: 400 });
  }
}
