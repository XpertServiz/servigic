"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/landing/Eyebrow";

interface FaqItem {
  q: string;
  a: string;
}

export function Faq() {
  const t = useTranslations("faq");
  const items = t.raw("items") as FaqItem[];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto max-w-[800px] px-6 py-24 md:py-32">
      <div className="mb-16 max-w-[640px]">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h2 className="font-display text-[clamp(32px,5vw,52px)] font-bold uppercase leading-tight">{t("title")}</h2>
      </div>
      <div>
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q} className="border-b border-border-subtle">
              <button
                className="flex w-full items-center justify-between py-5.5 text-start text-[17px] font-semibold"
                onClick={() => setOpenIndex(open ? null : i)}
              >
                {item.q}
                <span className={`ms-4 flex-none text-xl text-accent transition-transform ${open ? "rotate-45" : ""}`}>+</span>
              </button>
              <div
                className="overflow-hidden transition-[max-height] duration-250 ease-in-out"
                style={{ maxHeight: open ? "200px" : "0px" }}
              >
                <p className="max-w-[760px] pb-5.5 text-[15px] text-text-muted">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
