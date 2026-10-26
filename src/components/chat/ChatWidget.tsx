"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MIN_SCORE, normalize, rank, type KbEntry } from "@/lib/chat/match";
import { ChatAvatar } from "./ChatAvatar";

interface Kb {
  lang: string;
  ui: Record<string, string>;
  entries: KbEntry[];
  suggested: string[];
}
interface Msg {
  from: "me" | "bot";
  text: string;
  support?: boolean;
}

const LANG_NAMES: Record<string, string> = { en: "English", ur: "اردو", ar: "العربية", de: "Deutsch", fr: "Français", es: "Español", hi: "हिन्दी", pl: "Polski", tr: "Türkçe", it: "Italiano", pt: "Português", nl: "Nederlands" };
const RTL = new Set(["ar", "ur"]);
const CACHE_KEY = "sv_chat_answers";

function readCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
function writeCache(key: string, answer: string) {
  try {
    const all = readCache();
    all[key] = answer;
    const keys = Object.keys(all);
    if (keys.length > 60) delete all[keys[0]];
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {
    // private mode: the server cache still works
  }
}

/**
 * Website assistant. Answers from the site's own FAQ / how-it-works / trust texts in the browser (no server call, no cost);
 * only a question those texts cannot answer goes to the server, which keeps every answer so the same question is never paid
 * for twice. Opens in the language of the visitor's country (Arabic in Saudi Arabia, Urdu in Pakistan ...) with English one tap away.
 */
export function ChatWidget({ defaultLang, country, supportNumber }: { defaultLang: string; country: string; supportNumber?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(defaultLang);
  const [kb, setKb] = useState<Kb | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState(false);
  // The avatar button can be dragged anywhere (mouse or finger) and stays there on this device, so it never covers a
  // message box or button. Stored as an offset from its default corner.
  const [drag, setDrag] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  useEffect(() => {
    try {
      const v = localStorage.getItem("chat_fab_offset");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v) setDrag(JSON.parse(v) as { x: number; y: number });
    } catch {
      /* ignore */
    }
  }, []);
  const dragStart = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const langs = useMemo(() => Array.from(new Set([defaultLang, "en"])), [defaultLang]);

  // Remember the visitor's own language choice.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sv_chat_lang");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && langs.includes(saved)) setLang(saved);
    } catch {
      /* ignore */
    }
  }, [langs]);

  const loadKb = useCallback(async (l: string) => {
    try {
      const res = await fetch(`/api/chat/kb?lang=${encodeURIComponent(l)}&country=${encodeURIComponent(country)}`);
      if (res.ok) {
        const k = (await res.json()) as Kb;
        setKb(k);
        return k;
      }
    } catch {
      /* offline: the panel still opens, answers come from the server when it is back */
    }
    return null;
  }, [country]);

  // Warm the knowledge base after the page has settled (a few KB, cached by the CDN), then show a small hello once.
  useEffect(() => {
    const t = setTimeout(async () => {
      await loadKb(lang);
      try {
        if (!sessionStorage.getItem("sv_chat_tip")) {
          setTip(true);
          sessionStorage.setItem("sv_chat_tip", "1");
          setTimeout(() => setTip(false), 7000);
        }
      } catch {
        setTip(true);
      }
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && (!kb || kb.lang !== lang)) loadKb(lang);
  }, [open, lang, kb, loadKb]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, open]);

  if (pathname.startsWith("/admin")) return null;

  const ui = kb?.ui ?? {};
  const dir = RTL.has(lang) ? "rtl" : "ltr";
  const supportHref = supportNumber ? `https://wa.me/${supportNumber.replace(/[^\d]/g, "")}` : null;

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { from: "me", text: q }]);
    setInput("");
    const k = kb ?? (await loadKb(lang));
    // 1. the site's own texts, right here in the browser
    const best = k ? rank(q, k.entries, 1)[0] : undefined;
    if (best && best.score >= MIN_SCORE) {
      setMsgs((m) => [...m, { from: "bot", text: best.entry.a }]);
      return;
    }
    // 2. answered before on this device
    const key = `${lang}|${normalize(q)}`;
    const cached = readCache()[key];
    if (cached) {
      setMsgs((m) => [...m, { from: "bot", text: cached }]);
      return;
    }
    // 3. the server (its own cache first, an AI answer only for a question nobody has asked yet)
    setBusy(true);
    try {
      const res = await fetch("/api/chat/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, country, question: q }) });
      const data = (await res.json().catch(() => null)) as { answer?: string | null } | null;
      if (data?.answer) {
        writeCache(key, data.answer);
        setMsgs((m) => [...m, { from: "bot", text: data.answer as string }]);
      } else {
        setMsgs((m) => [...m, { from: "bot", text: ui.notFound ?? "…", support: true }]);
      }
    } catch {
      setMsgs((m) => [...m, { from: "bot", text: ui.notFound ?? "…", support: true }]);
    } finally {
      setBusy(false);
    }
  }

  function pickLang(l: string) {
    setLang(l);
    setMsgs([]);
    try {
      localStorage.setItem("sv_chat_lang", l);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {!open && (
        <div
          className="fixed bottom-24 end-4 z-40 flex touch-none select-none items-end gap-2"
          style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}
          onPointerDown={(e) => {
            dragStart.current = { px: e.clientX, py: e.clientY, x: drag.x, y: drag.y, moved: false };
            dragged.current = false;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = dragStart.current;
            if (!d) return;
            const dx = e.clientX - d.px;
            const dy = e.clientY - d.py;
            if (!d.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
            d.moved = true;
            // Keep the button on screen (it starts 16px from the end edge and 96px from the bottom).
            const w = window.innerWidth;
            const h = window.innerHeight;
            const rtl = document.documentElement.dir === "rtl";
            const x = rtl ? Math.min(Math.max(d.x + dx, 0), w - 96) : Math.max(Math.min(d.x + dx, 0), -(w - 96));
            setDrag({ x, y: Math.max(Math.min(d.y + dy, 80), -(h - 190)) });
          }}
          onPointerUp={() => {
            if (dragStart.current?.moved) {
              dragged.current = true;
              try {
                window.localStorage.setItem("chat_fab_offset", JSON.stringify(drag));
              } catch {
                /* ignore */
              }
            }
            dragStart.current = null;
          }}
        >
          {tip && ui.tooltip && (
            <div dir={dir} className="mb-3 max-w-[200px] rounded-2xl rounded-ee-sm border border-border-subtle bg-bg-elevated px-3.5 py-2 text-[13px] font-semibold text-text shadow-lg">
              {ui.tooltip}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (dragged.current) {
                dragged.current = false;
                return;
              }
              setOpen(true);
              setTip(false);
            }}
            aria-label={ui.title ?? "Chat"}
            className="rounded-full shadow-[0_10px_30px_rgba(255,176,32,.35)] transition-transform hover:-translate-y-1 hover:scale-105"
          >
            <ChatAvatar size={72} />
          </button>
        </div>
      )}

      {open && (
        <div className="fixed bottom-4 end-4 z-50">
        <div dir={dir} role="dialog" aria-label={ui.title ?? "Chat"} className="flex h-[min(560px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border-subtle bg-bg-elevated shadow-[0_24px_60px_rgba(0,0,0,.55)]">
          <div className="flex items-center gap-3 border-b border-border-subtle bg-bg-elevated-2 px-4 py-3">
            <ChatAvatar size={44} waving={false} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{ui.title ?? "Servigic"}</div>
              {langs.length > 1 && (
                <div className="mt-1 flex gap-1.5" role="group" aria-label="Language">
                  {langs.map((l) => (
                    <button key={l} type="button" onClick={() => pickLang(l)} aria-pressed={lang === l} className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${lang === l ? "border-accent bg-accent/15 text-accent" : "border-border-subtle text-text-muted"}`}>
                      {LANG_NAMES[l] ?? l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={ui.close ?? "Close"} className="rounded-full p-2 text-text-muted hover:text-text">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[14px] leading-relaxed">
            <div className="max-w-[88%] rounded-2xl rounded-ss-sm bg-bg-elevated-2 px-3.5 py-2.5">{ui.hello ?? "…"}</div>
            {msgs.length === 0 && kb && kb.suggested.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{ui.popular}</div>
                {kb.suggested.map((id) => {
                  const e = kb.entries.find((x) => x.id === id);
                  return e ? (
                    <button key={id} type="button" onClick={() => ask(e.q)} className="block w-full rounded-xl border border-border-subtle px-3 py-2 text-start text-[13px] text-text-muted transition-colors hover:border-accent hover:text-text">
                      {e.q}
                    </button>
                  ) : null;
                })}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.from === "me" ? "flex justify-end" : "flex"}>
                <div className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 ${m.from === "me" ? "rounded-ee-sm bg-accent text-accent-foreground" : "rounded-ss-sm bg-bg-elevated-2"}`}>
                  {m.text}
                  {m.support && supportHref && (
                    <a href={supportHref} target="_blank" rel="noopener noreferrer" className="mt-2 block rounded-full bg-secondary px-3 py-1.5 text-center text-[12px] font-semibold text-secondary-foreground">
                      {ui.whatsapp}
                    </a>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="max-w-[60%] rounded-2xl rounded-ss-sm bg-bg-elevated-2 px-3.5 py-2.5 text-text-muted">{ui.typing}</div>}
            <div ref={bottom} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex gap-2 border-t border-border-subtle p-3"
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={300} placeholder={ui.placeholder} className="min-w-0 flex-1 rounded-full border border-border-subtle bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent" />
            <button type="submit" disabled={busy || !input.trim()} className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50">
              {ui.send}
            </button>
          </form>
        </div>
        </div>
      )}
    </>
  );
}
