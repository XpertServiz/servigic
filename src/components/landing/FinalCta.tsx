import { Button } from "@/components/ui/Button";

export function FinalCta() {
  return (
    <section id="post" className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="rounded-3xl border border-accent/30 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(255,176,32,.22),transparent_70%)] bg-bg-elevated px-6 py-28 text-center">
        <h2 className="font-display text-[clamp(38px,7vw,72px)] font-bold uppercase leading-[1.02]">
          STOP GAMBLING.
          <br />
          <span className="text-accent">START FIXING.</span>
        </h2>
        <p className="mx-auto my-5 max-w-lg text-lg text-text-muted">
          Post your first job free. Bids in minutes. Money protected.
        </p>
        <div className="mb-8 flex flex-wrap justify-center gap-4">
          <Button href="/signup?role=customer" size="lg">
            Post a Job →
          </Button>
          <Button href="/pro" variant="ghost" size="lg">
            Become a Pro
          </Button>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-[13px] text-text-dim text-text-muted">
          {["Free to post", "Escrow protected", "Verified pros", "7-day warranty"].map((c) => (
            <span key={c}>
              <span className="mr-1 text-secondary">✓</span>
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
