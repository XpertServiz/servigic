"use client";

import { useCallback, useEffect, useState } from "react";

type ReviewCard = { id: string; rating: number; comment: string; areaLabel: string; categoryName: string };

const ROTATE_MS = 2000;
const PAGE_SIZE = 3;

export function ReviewsCarousel({ reviews }: { reviews: ReviewCard[] }) {
  const pages: ReviewCard[][] = [];
  for (let i = 0; i < reviews.length; i += PAGE_SIZE) pages.push(reviews.slice(i, i + PAGE_SIZE));

  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setPage((p) => (p + 1) % pages.length), [pages.length]);
  const prev = useCallback(() => setPage((p) => (p - 1 + pages.length) % pages.length), [pages.length]);

  // Auto-advance every 2s so new reviews keep surfacing without user action;
  // paused on hover/focus so someone actively reading isn't yanked away.
  useEffect(() => {
    if (pages.length <= 1 || paused) return;
    const id = setInterval(next, ROTATE_MS);
    return () => clearInterval(id);
  }, [pages.length, paused, next]);

  if (pages.length === 0) return null;

  return (
    <div className="mt-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {pages[page].map((r) => (
          <div key={r.id} className="rounded-[14px] border border-border-subtle bg-bg-elevated p-6">
            <div className="mb-2.5 text-[13px] text-accent">{"★".repeat(r.rating)}</div>
            <p className="mb-4 text-sm text-text-muted">&quot;{r.comment}&quot;</p>
            <div className="text-[13px] font-bold">
              {r.areaLabel} · {r.categoryName}
            </div>
          </div>
        ))}
      </div>

      {pages.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={prev}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            aria-label="Previous reviews"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-lg hover:border-accent hover:text-accent"
          >
            ‹
          </button>
          <div className="flex gap-1.5">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Go to review page ${i + 1}`}
                className={`h-2 w-2 rounded-full transition-colors ${i === page ? "bg-accent" : "bg-border-subtle"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            aria-label="Next reviews"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-lg hover:border-accent hover:text-accent"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
