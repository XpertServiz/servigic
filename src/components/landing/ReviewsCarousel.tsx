"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type ReviewCard = { id: string; rating: number; comment: string; areaLabel: string; categoryName: string };

const ROTATE_MS = 4000;
const PAGE_SIZE = 3;

export function ReviewsCarousel({ reviews }: { reviews: ReviewCard[] }) {
  const t = useTranslations("results");
  const pages: ReviewCard[][] = [];
  for (let i = 0; i < reviews.length; i += PAGE_SIZE) pages.push(reviews.slice(i, i + PAGE_SIZE));

  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setPage((p) => (p + 1) % pages.length), [pages.length]);
  const prev = useCallback(() => setPage((p) => (p - 1 + pages.length) % pages.length), [pages.length]);

  // Auto-advance so new reviews keep surfacing without user action;
  // paused on hover/focus so someone actively reading isn't yanked away.
  useEffect(() => {
    if (pages.length <= 1 || paused) return;
    const id = setInterval(next, ROTATE_MS);
    return () => clearInterval(id);
  }, [pages.length, paused, next]);

  if (pages.length === 0) return null;

  const arrow = "flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-lg transition-colors hover:border-accent hover:text-accent";

  return (
    <div className="mt-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        {pages[page].map((r) => (
          <div key={r.id} className="sv-card p-6">
            <div className="mb-2.5 text-[13px] text-accent" aria-label={`${r.rating}/5`}>
              {"★".repeat(r.rating)}
            </div>
            <p className="mb-4 text-sm text-text-muted">&quot;{r.comment}&quot;</p>
            <div className="text-[13px] font-bold">
              {r.areaLabel} · {r.categoryName}
            </div>
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button type="button" onClick={prev} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} aria-label={t("prev")} className={arrow}>
            <span aria-hidden className="rtl:rotate-180">‹</span>
          </button>
          <div className="flex gap-1.5">
            {pages.map((_, i) => (
              <button key={i} type="button" onClick={() => setPage(i)} aria-label={t("goto", { n: i + 1 })} className={`h-2 w-2 rounded-full transition-colors ${i === page ? "bg-accent" : "bg-border-subtle"}`} />
            ))}
          </div>
          <button type="button" onClick={next} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} aria-label={t("next")} className={arrow}>
            <span aria-hidden className="rtl:rotate-180">›</span>
          </button>
        </div>
      )}
    </div>
  );
}
