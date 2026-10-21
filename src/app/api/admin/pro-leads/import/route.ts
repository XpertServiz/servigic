import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { guessMapping, parseSheet, runImport, type ColumnMapping } from "@/lib/leadImport";

export const maxDuration = 120;

// Multipart form: file (.csv / .xlsx) + step. step=parse returns the headers, a guessed column mapping and the
// first rows; step=preview / step=import run the import with the chosen mapping (preview writes nothing).
export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) return NextResponse.json({ error: "Choose a CSV or XLSX file." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "The file is bigger than 8 MB." }, { status: 400 });
  if (!/\.(csv|xlsx)$/i.test(file.name)) return NextResponse.json({ error: "Only .csv and .xlsx files can be imported." }, { status: 400 });

  let sheet;
  try {
    sheet = await parseSheet(Buffer.from(await file.arrayBuffer()), file.name);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read the file." }, { status: 400 });
  }

  const step = String(form.get("step") ?? "parse");
  if (step === "parse") {
    const templates = await prisma.importMapping.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({
      headers: sheet.headers,
      sample: sheet.rows.slice(0, 5),
      total: sheet.rows.length,
      guess: guessMapping(sheet.headers),
      templates: templates.map((t) => ({ name: t.name, mapping: t.mapping })),
    });
  }

  let mapping: ColumnMapping;
  try {
    mapping = JSON.parse(String(form.get("mapping") ?? "{}"));
  } catch {
    return NextResponse.json({ error: "The column mapping is not valid." }, { status: 400 });
  }
  if (mapping.phone == null) return NextResponse.json({ error: "Choose which column holds the phone number." }, { status: 400 });

  const sourceName = String(form.get("sourceName") ?? file.name).trim().slice(0, 80) || file.name;
  const saveTemplate = String(form.get("saveTemplate") ?? "").trim().slice(0, 60);
  if (step === "import" && saveTemplate) {
    await prisma.importMapping.upsert({ where: { name: saveTemplate }, update: { mapping }, create: { name: saveTemplate, mapping } });
  }
  const report = await runImport({
    rows: sheet.rows,
    mapping,
    sourceName,
    defaultCountry: String(form.get("country") ?? "PK").toUpperCase().slice(0, 2),
    defaultCity: String(form.get("city") ?? "").trim() || undefined,
    geocode: String(form.get("geocode") ?? "") === "1",
    commit: step === "import",
  });
  return NextResponse.json({ report });
}
