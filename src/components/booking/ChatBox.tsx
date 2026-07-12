"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Message = { id: string; body: string; senderId: string; createdAt: string; sender: { name: string; role: string } };

export function ChatBox({ bookingId, currentUserId, unlocked }: { bookingId: string; currentUserId: string; unlocked: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/bookings/${bookingId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }

  useEffect(() => {
    if (!unlocked) return;
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) throw new Error();
      setText("");
      await load();
    } catch {
      toast.error("Message failed to send");
    } finally {
      setPending(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="rounded-[12px] border border-border-subtle bg-bg-elevated p-6 text-center text-sm text-text-muted">
        🔒 Chat unlocks once payment is verified.
      </div>
    );
  }

  return (
    <div className="flex h-80 flex-col rounded-[12px] border border-border-subtle bg-bg-elevated">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => {
          const isMine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-[10px] px-3 py-2 text-sm ${isMine ? "bg-accent/10" : "bg-bg-elevated-2"}`}>
                <div className="mb-0.5 text-[10px] font-bold uppercase text-text-dim text-text-muted">{m.sender.name}</div>
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border-subtle p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-[8px] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
