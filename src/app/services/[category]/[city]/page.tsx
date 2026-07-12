import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

function titleCase(slug: string) {
  return slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

async function getData(categorySlug: string, city: string) {
  const category = await prisma.serviceCategory.findUnique({
    where: { slug: categorySlug },
    include: { subServices: true },
  });
  if (!category) return null;

  const cityLabel = titleCase(city);
  const weekAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [acceptedBids, jobCount] = await Promise.all([
    prisma.bid.findMany({
      where: { status: "ACCEPTED", job: { categoryId: category.id, city: cityLabel }, createdAt: { gte: weekAgo } },
      select: { pricePKR: true },
    }),
    prisma.job.count({ where: { categoryId: category.id, city: cityLabel } }),
  ]);

  const avgWinningBid =
    acceptedBids.length >= 5 ? Math.round(acceptedBids.reduce((s, b) => s + b.pricePKR, 0) / acceptedBids.length) : null;

  return { category, cityLabel, avgWinningBid, jobCount };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; city: string }>;
}): Promise<Metadata> {
  const { category, city } = await params;
  const data = await getData(category, city);
  if (!data) return {};
  const cityLabel = titleCase(city);
  return {
    title: `${data.category.name} in ${cityLabel} — Bids in Minutes | Servigic`,
    description: `Post a ${data.category.name.toLowerCase()} job in ${cityLabel} and get bids from verified pros in minutes. Money protected in escrow until the work is done.`,
  };
}

const FAQ_TEMPLATE = (categoryName: string, cityLabel: string) => [
  { q: `How much does a ${categoryName.toLowerCase()} cost in ${cityLabel}?`, a: `Prices vary by job — post your job free and compare real bids from verified pros in ${cityLabel} before you pay anything.` },
  { q: "Is my payment protected?", a: "Yes — your payment sits in Servigic escrow and is only released to the pro after you confirm the job is done." },
  { q: "How fast will I get bids?", a: "Emergency jobs typically get a first bid in under 10 minutes since every matching nearby pro is alerted instantly." },
  { q: "Are the pros verified?", a: "All providers submit CNIC and a selfie for Level 1 approval; Level 2 pros are police-verified." },
];

export default async function ServiceCityPage({ params }: { params: Promise<{ category: string; city: string }> }) {
  const { category, city } = await params;
  const data = await getData(category, city);
  if (!data) notFound();

  const faqs = FAQ_TEMPLATE(data.category.name, data.cityLabel);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-[900px] px-6 py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">
            {data.category.name} · {data.cityLabel}
          </p>
          <h1 className="mb-4 font-display text-4xl font-bold uppercase leading-tight md:text-5xl">
            {data.category.name} in {data.cityLabel} — Bids in Minutes
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-text-muted">
            Post your {data.category.name.toLowerCase()} job and verified pros in {data.cityLabel} race to bid. Compare
            price, rating, and ETA — pay only into protected escrow.
          </p>

          <div className="mb-10 flex flex-wrap gap-6">
            <div className="rounded-[12px] border border-border-subtle bg-bg-elevated px-5 py-4">
              <div className="font-display text-2xl font-bold text-accent">
                {data.avgWinningBid ? `PKR ${data.avgWinningBid.toLocaleString()}` : "Get real bids"}
              </div>
              <div className="text-xs text-text-muted">
                {data.avgWinningBid ? "Avg. winning bid (30 days)" : "Price varies by job — post to compare"}
              </div>
            </div>
            {data.category.minPricePKR && (
              <div className="rounded-[12px] border border-border-subtle bg-bg-elevated px-5 py-4">
                <div className="font-display text-2xl font-bold text-accent">
                  PKR {data.category.minPricePKR.toLocaleString()}+
                </div>
                <div className="text-xs text-text-muted">Typical starting price</div>
              </div>
            )}
          </div>

          <Button href={`/jobs/new`} size="lg" className="mb-16">
            Post a {data.category.name} Job →
          </Button>

          {data.category.subServices.length > 0 && (
            <div className="mb-16">
              <h2 className="mb-4 font-display text-xl font-bold uppercase">Sub-services</h2>
              <div className="flex flex-wrap gap-2">
                {data.category.subServices.map((s) => (
                  <span key={s.id} className="rounded-full border border-border-subtle px-3 py-1.5 text-sm text-text-muted">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-4 font-display text-xl font-bold uppercase">FAQ</h2>
            <div className="flex flex-col gap-4">
              {faqs.map((f) => (
                <div key={f.q} className="rounded-[12px] border border-border-subtle bg-bg-elevated p-5">
                  <h3 className="mb-1 font-semibold">{f.q}</h3>
                  <p className="text-sm text-text-muted">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
