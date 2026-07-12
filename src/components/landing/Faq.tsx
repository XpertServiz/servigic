"use client";

import { useState } from "react";
import { Eyebrow } from "@/components/landing/Eyebrow";

const FAQS = [
  {
    q: "Is posting a job free?",
    a: "Yes — posting a job is always free. You only pay once you accept a bid, and that payment goes straight into protected escrow.",
  },
  {
    q: "How does escrow protect me?",
    a: "Your payment is held by Servigic, not the pro, until you confirm the job is done. If something's wrong, you can open a dispute before funds are released.",
  },
  {
    q: "What if the pro finds extra work on-site?",
    a: "They submit a Change Order with a photo and price — you approve (and pay the difference into escrow) before any extra work happens.",
  },
  {
    q: "What if I'm not satisfied?",
    a: "Every job carries a 7-day workmanship warranty. Open a dispute and our team reviews photos from both sides to release, partially refund, or fully refund your payment.",
  },
  {
    q: "Why can't I see the pro's phone number before paying?",
    a: "Contact details stay masked until payment is secured — this stops off-platform deals that leave you with zero protection.",
  },
  {
    q: "How fast do bids arrive?",
    a: "For Emergency jobs, most customers see their first bid in under 10 minutes since every matching nearby pro is alerted instantly.",
  },
  {
    q: "How do pros get paid?",
    a: "Straight to EasyPaisa, JazzCash, or bank transfer after you confirm the job is done, minus Servigic's 12% commission.",
  },
  {
    q: "Which cities?",
    a: "Launching in Karachi, then Lahore and Islamabad/Rawalpindi, followed by GCC and North America.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="mx-auto max-w-[800px] px-6 py-24 md:py-32">
      <div className="mb-16 max-w-[640px]">
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="font-display text-[clamp(32px,5vw,52px)] font-bold uppercase leading-tight">QUESTIONS? ANSWERED.</h2>
      </div>
      <div>
        {FAQS.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q} className="border-b border-border-subtle">
              <button
                className="flex w-full items-center justify-between py-5.5 text-left text-[17px] font-semibold"
                onClick={() => setOpenIndex(open ? null : i)}
              >
                {item.q}
                <span className={`ml-4 flex-none text-xl text-accent transition-transform ${open ? "rotate-45" : ""}`}>+</span>
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
