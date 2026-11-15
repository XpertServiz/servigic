import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { LLink } from "@/components/i18n/LLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteSettingsPublic } from "@/lib/publicData";
import { bigProjectsEnabled } from "@/lib/bigProjects";
import { COPY, SEO_CITIES, SEO_TRADES } from "@/lib/projectsContent";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata, SITE_NAME } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";
import { ProjectForm } from "../../ProjectForm";

export const revalidate = 604800;
export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_TRADES.flatMap((t) => SEO_CITIES.map((c) => ({ trade: t.slug, city: c.slug })));
}

function find(trade: string, city: string) {
  const t = SEO_TRADES.find((x) => x.slug === trade);
  const c = SEO_CITIES.find((x) => x.slug === city);
  return t && c ? { t, c } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ trade: string; city: string }> }): Promise<Metadata> {
  const { trade, city } = await params;
  const f = find(trade, city);
  if (!f || !bigProjectsEnabled()) return { robots: { index: false, follow: false } };
  const locale = (await getLocale()) as Locale;
  return pageMetadata({
    path: `/projects/${trade}/${city}`, locale, indexedLocales: ["en"],
    title: `${f.t.name} for a whole house in ${f.c.name} | Servigic`,
    description: `${f.t.name} for new houses and renovations in ${f.c.name}. Free site visit, one written contract amount and verified pros.`,
    keywords: [`${f.t.name} ${f.c.name}`, `${f.t.name} contractor ${f.c.name}`, "Servigic big projects"],
  });
}

export default async function TradeCityPage({ params }: { params: Promise<{ trade: string; city: string }> }) {
  const { trade, city } = await params;
  const f = find(trade, city);
  if (!f || !bigProjectsEnabled()) notFound();
  const locale = (await getLocale()) as Locale;
  const { t, c } = f;
  const faq = [
    { q: `How much does ${t.name.toLowerCase()} for a whole house cost in ${c.name}?`, a: "It depends on the site, the size and the materials. After a free site visit Servigic gives you one contract amount in writing before any work starts." },
    { q: "Is the site visit free?", a: "Yes." },
    { q: "What if there is a problem after the work?", a: "Within 15 days Servigic comes back and fixes it." },
    ...COPY.en.faq.filter((x) => ["Are materials included?", "How do I pay?"].includes(x.q)),
  ];
  const settings = await getSiteSettingsPublic().catch(() => null);
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "Service", name: `${t.name} in ${c.name}`, serviceType: t.name, provider: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") }, areaServed: { "@type": "City", name: c.name }, description: t.intro },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
    breadcrumbJsonLd([{ name: SITE_NAME, path: "/" }, { name: "Big Projects", path: "/projects" }, { name: `${t.name} ${c.name}`, path: `/projects/${trade}/${city}` }], locale),
  ];
  return (
    <>
      <JsonLd data={jsonLd} />
      <Navbar />
      <main id="main" className="flex-1">
        <section className="container-x max-w-[820px] py-14 md:py-20">
          <Eyebrow>{`Big Projects - ${c.name}`}</Eyebrow>
          <h1 className="mb-4 text-[clamp(28px,5vw,48px)] font-extrabold leading-[1.1] tracking-[-0.018em]">{t.name} for a whole house in {c.name}</h1>
          <p className="text-text-muted md:text-lg">{t.intro}</p>
          <h2 className="mb-2 mt-8 text-xl font-bold">What is included</h2>
          <ul className="list-disc ps-5 text-text-muted">{t.points.map((p) => <li key={p}>{p}</li>)}</ul>
          <h2 className="mb-2 mt-8 text-xl font-bold">In {c.name}</h2>
          <p className="text-text-muted">{c.local}</p>
          <h2 className="mb-2 mt-8 text-xl font-bold">How it works</h2>
          <ol className="list-decimal ps-5 text-text-muted">{COPY.en.steps.map(([a, b]) => <li key={a}><b className="text-text">{a}.</b> {b}</li>)}</ol>
          <h2 className="mb-3 mt-8 text-xl font-bold">Questions</h2>
          <div className="flex flex-col gap-2">{faq.map((x) => <details key={x.q} className="sv-card p-4"><summary className="cursor-pointer font-semibold">{x.q}</summary><p className="mt-2 text-sm text-text-muted">{x.a}</p></details>)}</div>
          <h2 className="mb-3 mt-10 text-xl font-bold">Get a free estimate</h2>
          <ProjectForm whatsapp={settings?.whatsappSupportNumber ?? null} />
          <p className="mt-8 text-sm text-text-muted">
            <LLink href="/projects" className="underline">All Big Projects</LLink>
            {SEO_CITIES.filter((x) => x.slug !== city).map((x) => <span key={x.slug}> - <LLink href={`/projects/${trade}/${x.slug}`} className="underline">{t.name} {x.name}</LLink></span>)}
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
