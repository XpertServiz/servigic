// On-device ID text extraction (Google ML Kit, via expo-text-extractor) used ONLY
// to save the admin reviewer from retyping the ID's details. It never decides
// anything: a human approves every Pro (spec §4.4). Every step is best-effort —
// if ML Kit is unavailable or reads nothing, the Pro simply submits the photo
// and the reviewer checks it by eye.
import { extractTextFromImage, isSupported } from "expo-text-extractor";

export interface IdOcr {
  fullName?: string;
  idNumber?: string;
  dob?: string;
  address?: string;
  rawLines?: string[];
}

const LABELS = /^(name|father'?s? name|husband'?s? name|gender|country of stay|identity number|date of birth|date of issue|date of expiry|signature|holder'?s? signature|present address|permanent address|address)$/i;

function clean(lines: string[]): string[] {
  return lines.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** The CNIC number: 12345-1234567-1, or 13 digits that OCR ran together. */
function findIdNumber(text: string): string | undefined {
  const dashed = text.match(/\b\d{5}\s?-\s?\d{7}\s?-\s?\d\b/);
  if (dashed) return dashed[0].replace(/\s/g, "");
  const plain = text.match(/\b(\d{5})(\d{7})(\d)\b/);
  return plain ? `${plain[1]}-${plain[2]}-${plain[3]}` : undefined;
}

/** DOB is the earliest of the dates on the card (issue/expiry dates are later). */
function findDob(lines: string[]): string | undefined {
  const dates: { raw: string; year: number }[] = [];
  for (const line of lines) {
    for (const m of line.matchAll(/\b(\d{2})[./-](\d{2})[./-](\d{4})\b/g)) dates.push({ raw: m[0], year: Number(m[3]) });
  }
  dates.sort((a, b) => a.year - b.year);
  return dates[0]?.raw;
}

function valueAfterLabel(lines: string[], label: RegExp, take = 1): string | undefined {
  const i = lines.findIndex((l) => label.test(l));
  if (i < 0) return undefined;
  const out: string[] = [];
  for (let j = i + 1; j < lines.length && out.length < take; j++) {
    if (LABELS.test(lines[j]) || findIdNumber(lines[j])) break;
    out.push(lines[j]);
  }
  return out.length ? out.join(", ") : undefined;
}

export function parseIdLines(rawLines: string[]): IdOcr {
  const lines = clean(rawLines);
  const joined = lines.join(" ");
  const fullName = valueAfterLabel(lines, /^name$/i);
  const idNumber = findIdNumber(joined);
  const dob = findDob(lines);
  const address = valueAfterLabel(lines, /^(present|permanent)? ?address$/i, 3);
  return { fullName, idNumber, dob, address, rawLines: lines.slice(0, 40).map((l) => l.slice(0, 200)) };
}

/** Reads an ID photo on-device. Returns null when OCR isn't available or finds no text. */
export async function readIdCard(uri: string): Promise<IdOcr | null> {
  try {
    if (!isSupported) return null;
    const lines = await extractTextFromImage(uri);
    if (!lines || lines.length === 0) return null;
    return parseIdLines(lines);
  } catch (e) {
    console.warn("[ocr] could not read ID photo", e);
    return null;
  }
}
