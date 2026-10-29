"use client";

import { useState } from "react";

// A small emoji library for category icons (type or paste any other emoji in the box).
const GROUPS: { name: string; items: string[] }[] = [
  { name: "Home & repair", items: "🔧 🔨 🪛 🪚 🛠️ ⚙️ 🔩 🪜 🧰 💡 🔌 🔦 🚿 🚰 🛁 🚽 🪠 🧱 🪟 🚪 🔑 🏠 🏡 🏗️ 🪴 🛋️ 🛏️ 🪞".split(" ") },
  { name: "Cleaning & care", items: "🧹 🧼 🧽 🧴 🪣 🧺 🫧 🧯 🐜 🪰 🪳 🌿 🌱 🌳 ✂️ 🪒 💈 💅 💆".split(" ") },
  { name: "Vehicles", items: "🚗 🚙 🚕 🚛 🚚 🛻 🚜 🏍️ 🛵 🚲 ⛽ 🛞 🔋 🚨 🅿️ 🚧 ⚓".split(" ") },
  { name: "Tech & energy", items: "❄️ ☀️ 🔥 💧 ⚡ 🔋 📡 📶 💻 🖥️ 📱 🖨️ 📺 🎥 📷 🔒 🛡️".split(" ") },
  { name: "People & services", items: "👷 🧑‍🔧 🧑‍🍳 🧑‍🏫 👨‍⚕️ 🧑‍🌾 🚚 📦 🎉 🎂 🍽️ 🐕 🐈 👶 🧓 🚑 ⚖️ 📚 🎨 🧵 🪡 👗 💍".split(" ") },
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-1.5 text-xl" aria-label="Choose an emoji">
          {value || "🛠️"}
        </button>
        <input value={value} onChange={(e) => onChange(e.target.value.slice(0, 16))} placeholder="or type / paste an emoji" className="w-44 rounded-[8px] border border-border-subtle bg-bg-elevated-2 px-3 py-1.5 text-sm" />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 max-h-72 w-80 overflow-y-auto rounded-[12px] border border-border-subtle bg-bg-elevated p-3 shadow-xl">
          {GROUPS.map((g) => (
            <div key={g.name} className="mb-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{g.name}</div>
              <div className="flex flex-wrap gap-1">
                {g.items.map((e, i) => (
                  <button
                    key={e + i}
                    type="button"
                    onClick={() => {
                      onChange(e);
                      setOpen(false);
                    }}
                    className="rounded-[6px] px-1.5 py-1 text-xl hover:bg-bg-elevated-2"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
