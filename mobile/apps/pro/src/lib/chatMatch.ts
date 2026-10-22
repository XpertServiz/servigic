// Same matcher as the website (src/lib/chat/match.ts): shared verbatim by apps/customer and apps/pro.
// Finds the best answer to a question among the site's own FAQ / how-it-works / trust texts, with no server call and no AI.
// Works in any language that separates words with spaces or punctuation (Latin, Arabic, Urdu, Devanagari ...): the words of the
// question are compared with the words of every entry, rarer words counting for more (IDF), and word beginnings
// count too ("cancel" matches "cancels"). It also forgives spelling mistakes ("hwo to registre" = "how to register") and
// understands everyday synonyms (register / sign up / join), all in the browser or app: no server call, no AI.
// Shared by the browser, the apps' server route and tests.

export interface KbEntry {
  id: string;
  q: string;
  a: string;
  /** Extra words people use for this topic (synonyms, local words). Matched, never shown. */
  k?: string;
}

const STOP = new Set(
  (
    "a an the is are was were be to of in on at for and or if my me i you your it its this that do does did can could would should how what why when where which who " +
    "with from as by we our us not no yes please about into so than then there here have has had will just ما هي هو في من على عن إلى هل كيف ماذا لماذا متى أين الذي التي و أو لا نعم " +
    "کیا ہے ہیں کی کے کو میں سے اور یا نہیں ہاں کیسے کیوں کب کہاں جو یہ وہ اس ان مجھے میری آپ " +
    "der die das und oder ist sind ein eine einen zu von mit für auf im wie was warum wann wo le la les un une des et ou est sont de du pour dans comment pourquoi quand el los las y o es son " +
    "un una de del para en cómo qué por cuándo dónde jak co dlaczego kiedy gdzie czy się w z na do jest są " +
    "kaise kese kaisay karna karon karoon karen kar kya kia kiya hai hain ka ki ke ko mein me se aur nahi nahin mujhe mera meri main aap ap hum ho hoga kitna kitni kitne kahan kab dena dein lena servigic work works working"
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

// Everyday words that mean the same thing are folded into one (applied to the question and to the stored texts alike).
const SYNONYMS: Record<string, string[]> = {
  signup: ["register", "registration", "registering", "registered", "signup", "join", "enroll", "enrol", "subscribe", "onboard"],
  login: ["login", "signin", "logon"],
  price: ["price", "prices", "pricing", "cost", "costs", "charge", "charges", "fee", "fees", "rate", "rates", "expensive", "cheap", "qeemat", "kimat", "kharcha"],
  pay: ["pay", "payment", "payments", "paying", "paid", "cash", "money", "paisa", "paisay", "paise", "raqam"],
  cancel: ["cancel", "cancels", "cancellation", "cancelling", "canceled", "cancelled", "refund", "refunds"],
  bid: ["bid", "bids", "bidding", "offer", "offers", "quote", "quotes", "quotation"],
  pro: ["pro", "pros", "professional", "professionals", "technician", "technicians", "worker", "workers", "provider", "providers", "expert", "experts"],
  job: ["job", "jobs", "task", "tasks", "request", "requests"],
  verify: ["verify", "verified", "verification", "verifying", "kyc"],
  support: ["support", "help", "helpline", "assistance", "contact", "complain", "complaint", "complaints", "shikayat", "madad"],
  app: ["app", "apps", "application", "apk", "download", "install"],
  delete: ["delete", "remove", "deactivate"],
  topup: ["topup", "recharge", "deposit"],
  password: ["password", "passcode", "pwd", "forgot", "forget", "reset"],
};
const SYN = new Map<string, string>();
for (const [canon, words] of Object.entries(SYNONYMS)) for (const w of words) SYN.set(w, canon);
const canon = (w: string) => SYN.get(w) ?? w;

/** Two-word phrases that are one idea. */
function phrases(text: string): string {
  return text.replace(/sign up/g, "signup").replace(/(sign in|log in|log on)/g, "login").replace(/top up/g, "topup");
}

export function tokens(text: string): string[] {
  return phrases(normalize(text))
    .split(" ")
    .map(arStrip)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(canon);
}

/** Edit distance counting a swapped pair of letters ("hwo" / "how") as one mistake. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
    for (let j = 1; j <= b.length; j++) d[i][j] = i === 0 ? j : 0;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** How many mistakes a word of this length may have: none for tiny words (except a swap), one for short, two for long. */
const allowed = (len: number) => (len <= 3 ? 1 : len <= 7 ? 1 : 2);

const vocabCache = new WeakMap<KbEntry[], string[]>();
function vocabOf(entries: KbEntry[]): string[] {
  let v = vocabCache.get(entries);
  if (!v) {
    const set = new Set<string>(SYN.keys());
    for (const e of entries) for (const w of phrases(normalize(`${e.q} ${e.k ?? ""} ${e.a}`)).split(" ")) if (w.length > 2 && !STOP.has(w)) set.add(arStrip(w));
    v = [...set];
    vocabCache.set(entries, v);
  }
  return v;
}

const sortedLetters = (w: string) => [...w].sort().join("");

/**
 * One word of the question, repaired: a word the site knows stays; a misspelt one becomes the closest known word ("registre" ->
 * "register", "pasword" -> "password"); a misspelt filler word ("hwo", "waht") is dropped. Words nothing resembles are kept as typed.
 */
function repair(word: string, vocab: string[]): string | null {
  if (STOP.has(word)) return null;
  if (SYN.has(word) || word.length < 3) return word;
  if (vocab.includes(word)) return word;

  // Tiny words: only two swapped letters count as a typo ("hwo", "teh"), never a different letter.
  if (word.length === 3) {
    const key = sortedLetters(word);
    for (const sw of STOP) if (sw.length === 3 && sortedLetters(sw) === key && editDistance(word, sw, 1) === 1) return null;
    for (const v of vocab) if (v.length === 3 && sortedLetters(v) === key && editDistance(word, v, 1) === 1) return v;
    return word;
  }

  const lim = allowed(word.length);
  let best: string | null = null;
  let bestD = Infinity;
  for (const v of vocab) {
    const d = editDistance(word, v, lim);
    if (d <= lim && d < bestD) {
      best = v;
      bestD = d;
    }
  }
  // A misspelt filler word ("waht" for "what") is not a topic, unless a real site word is just as close.
  let stopD = Infinity;
  for (const sw of STOP) {
    if (sw.length < 4) continue;
    const d = editDistance(word, sw, 1);
    if (d < stopD) stopD = d;
  }
  if (stopD <= 1 && stopD < bestD) return null;
  return best ?? word;
}

/** The question's words with spelling mistakes repaired against what the site's texts actually say. */
function queryTokens(question: string, entries: KbEntry[]): string[] {
  const vocab = vocabOf(entries);
  const out: string[] = [];
  for (const raw of phrases(normalize(question)).split(" ")) {
    const w = arStrip(raw);
    if (w.length < 2) continue;
    const r = repair(w, vocab);
    if (r) out.push(canon(r));
  }
  return out;
}

const stem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w);

export interface Match {
  entry: KbEntry;
  score: number;
}

/** Best matches for `question`, strongest first. A score under `MIN_SCORE` means "no real answer here". */
export function rank(question: string, entries: KbEntry[], limit = 3): Match[] {
  const qTokens = queryTokens(question, entries);
  if (qTokens.length === 0) return [];
  const docs = entries.map((e) => ({ e, qt: tokens(`${e.q} ${e.k ?? ""}`), at: tokens(e.a) }));
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
