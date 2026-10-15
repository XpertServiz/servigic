"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SectionHead } from "@/components/ui/SectionHead";

interface FaqItem {
  q: string;
  a: string;
}

export function Faq() {
  const t = useTranslations("faq");
  const items = t.raw("items") as FaqItem[];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="container-x max-w-[860px] py-16 md:py-24">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} />
      <div className="sv-card divide-y divide-border-subtle px-5 md:px-8">
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q}>
              <h3>
                <button
                  className="flex w-full items-center justify-between gap-4 py-5 text-start text-[16px] font-semibold md:text-[17px]"
                  aria-expanded={open}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpenIndex(open ? null : i)}
                >
                  {item.q}
                  <span className={`flex-none text-2xl leading-none text-accent transition-transform duration-300 ${open ? "rotate-45" : ""}`} aria-hidden>
                    +
                  </span>
                </button>
              </h3>
              {/* Answers stay in the DOM (grid-rows trick) so crawlers and screen readers always see them. */}
              <div id={`faq-${i}`} className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <p className="max-w-[760px] pb-5 text-[15px] leading-relaxed text-text-muted">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
