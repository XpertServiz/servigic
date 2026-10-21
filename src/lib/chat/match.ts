// Finds the best answer to a question among the site's own FAQ / how-it-works / trust texts, with no server call and no AI.
// Works in any language that separates words with spaces or punctuation (Latin, Arabic, Urdu, Devanagari ...): the words of the
// question are compared with the words of every entry, rarer words counting for more (IDF), and word beginnings
// count too ("cancel" matches "cancels"). Shared by the browser, the apps' server route and tests.

export interface KbEntry {
  id: string;
  q: string;
  a: string;
}

const STOP = new Set(
  (
    "a an the is are was were be to of in on at for and or if my me i you your it its this that do does did can could would should how what why when where which who " +
    "with from as by we our us not no yes please about into so than then there here have has had will just ما هي هو في من على عن إلى هل كيف ماذا لماذا متى أين الذي التي و أو لا نعم " +
    "کیا ہے ہیں کی کے کو میں سے اور یا نہیں ہاں کیسے کیوں کب کہاں جو یہ وہ اس ان مجھے میری آپ " +
    "der die das und oder ist sind ein eine einen zu von mit für auf im wie was warum wann wo le la les un une des et ou est sont de du pour dans comment pourquoi quand el los las y o es son " +
    "un una de del para en cómo qué por cuándo dónde jak co dlaczego kiedy gdzie czy się w z na do jest są"
  ).split(/\s+/),
);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟؐ-ؚۖ-ۭ̀-ͯ]/g, "") // diacritics, Arabic harakat
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ک/g, "ك")
    .replace(/ی/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Arabic attaches "the" (ال), "and" (و) and "by/for" (ب، ل) to the word: strip them so "الهاتف" matches "هاتف".
const AR = /[؀-ۿ]/;
function arStrip(w: string): string {
  if (!AR.test(w)) return w;
  const x = w;
  for (const p of ["وال", "بال", "لل", "ال"]) if (x.startsWith(p) && x.length - p.length >= 2) return x.slice(p.length);
  return x;
}

export function tokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .map(arStrip)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

const stem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w);

export interface Match {
  entry: KbEntry;
  score: number;
}

/** Best matches for `question`, strongest first. A score under `MIN_SCORE` means "no real answer here". */
export function rank(question: string, entries: KbEntry[], limit = 3): Match[] {
  const qTokens = tokens(question);
  if (qTokens.length === 0) return [];
  const docs = entries.map((e) => ({ e, qt: tokens(e.q), at: tokens(e.a) }));
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set([...d.qt, ...d.at].map(stem))) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t: string) => Math.log(1 + docs.length / (1 + (df.get(stem(t)) ?? 0)));

  const out: Match[] = [];
  for (const d of docs) {
    const qSet = new Set(d.qt.map(stem));
    const aSet = new Set(d.at.map(stem));
    let score = 0;
    let max = 0;
    for (const t of qTokens) {
      const s = stem(t);
      const w = idf(t);
      max += w * 2;
      if (qSet.has(s)) score += w * 2; // a word of the stored question counts double
      else if (aSet.has(s)) score += w;
    }
    if (score > 0) out.push({ entry: d.e, score: max > 0 ? score / max : 0 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

export const MIN_SCORE = 0.3;
