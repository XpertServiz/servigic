import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildKb } from "@/lib/chat/kb";
import { MIN_SCORE, normalize, rank } from "@/lib/chat/match";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";

// Chat questions the site's own texts could not answer in the browser. Order of work, cheapest first:
//   1. the knowledge base again (a second look, in case the browser's copy was older);
//   2. the answer cache: a question asked before (by anyone) is answered from the database, never by a new AI call;
//   3. only if an AI key is configured AND today's AI budget is not used up: one short AI answer, then cached for everybody;
//   4. otherwise a polite "ask our team" answer, and the question is remembered so the admin can add it to the FAQ.
const schema = z.object({ lang: z.string().max(5).default("en"), country: z.string().length(2).default("PK"), question: z.string().trim().min(2).max(300) });

const DAILY_AI_LIMIT = Number(process.env.CHATBOT_DAILY_AI_LIMIT) || 150;
const kbMemo = new Map<string, { at: number; kb: Awaited<ReturnType<typeof buildKb>> }>();
async function kbFor(lang: string, country: string) {
  const key = `${lang}|${country}`;
  const hit = kbMemo.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.kb;
  const kb = await buildKb(lang, country);
  kbMemo.set(key, { at: Date.now(), kb });
  return kb;
}

const systemPrompt = (lang: string, context: string) =>
  `You are Servigic's support assistant. Servigic is a home-services marketplace: customers post a job, verified pros bid, the customer pays the pro directly (Servigic never holds money). ` +
  `Answer ONLY from the facts below, in the language with code "${lang}", in at most 4 short sentences. If the facts do not answer the question, say you are not sure and suggest asking the Servigic team on WhatsApp. ` +
  `Never invent prices, phone numbers, policies or legal promises.\n\nFACTS:\n${context}`;

/** OpenAI (gpt-4o-mini by default). Used first when OPENAI_API_KEY is set. */
async function askOpenAI(question: string, lang: string, context: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.CHATBOT_MODEL || "gpt-4o-mini",
        max_tokens: 350,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt(lang, context) },
          { role: "user", content: question },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/** Anthropic Claude: the alternative when only ANTHROPIC_API_KEY is set. */
async function askClaude(question: string, lang: string, context: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_CHATBOT_MODEL || "claude-haiku-5-5",
        max_tokens: 350,
        system: systemPrompt(lang, context),
        messages: [{ role: "user", content: question }],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    return json.content?.find((c) => c.type === "text")?.text?.trim() || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  const { lang, country, question } = parsed.data;

  const guard = await checkRateLimit(`chat:${clientKey(req)}`, 40, 3600);
  if (!guard.ok) return NextResponse.json({ answer: null, source: "limited" });

  const kb = await kbFor(lang, country);
  const best = rank(question, kb.entries, 1)[0];
  if (best && best.score >= MIN_SCORE) return NextResponse.json({ answer: best.entry.a, source: "kb", question: best.entry.q });

  const qHash = createHash("sha256").update(`${lang}|${normalize(question)}`).digest("hex").slice(0, 40);
  const cached = await prisma.chatAnswer.findUnique({ where: { lang_qHash: { lang, qHash } } }).catch(() => null);
  if (cached?.answer) {
    await prisma.chatAnswer.update({ where: { id: cached.id }, data: { hits: { increment: 1 }, lastAskedAt: new Date() } }).catch(() => null);
    return NextResponse.json({ answer: cached.answer, source: "cache" });
  }

  let answer: string | null = null;
  if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const usedToday = await prisma.chatAnswer.count({ where: { source: "ai", createdAt: { gte: since } } }).catch(() => DAILY_AI_LIMIT);
    if (usedToday < DAILY_AI_LIMIT) {
      const context = rank(question, kb.entries, 6).map((m) => `Q: ${m.entry.q}\nA: ${m.entry.a}`).join("\n\n") || kb.entries.slice(0, 6).map((e) => `Q: ${e.q}\nA: ${e.a}`).join("\n\n");
      answer = (await askOpenAI(question, lang, context)) ?? (await askClaude(question, lang, context));
    }
  }

  if (cached) {
    await prisma.chatAnswer.update({ where: { id: cached.id }, data: { hits: { increment: 1 }, lastAskedAt: new Date(), ...(answer ? { answer, source: "ai" } : {}) } }).catch(() => null);
  } else {
    await prisma.chatAnswer.create({ data: { lang, qHash, question: question.slice(0, 300), answer, source: answer ? "ai" : "none" } }).catch(() => null);
  }
  return NextResponse.json({ answer, source: answer ? "ai" : "none" });
}
