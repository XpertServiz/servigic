import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { LLink } from "@/components/i18n/LLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteSettingsPublic } from "@/lib/publicData";
import { bigProjectsEnabled, PROJECT_TRADES } from "@/lib/bigProjects";
import { COPY, SEO_CITIES, SEO_TRADES, type Lang } from "@/lib/projectsContent";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata, SITE_NAME } from "@/lib/seo";
import type { Locale } from "@/i18n/locales";
import { ProjectForm } from "./ProjectForm";

export const revalidate = 3600;

const lang = (l: string): Lang => (l === "ur" ? "ur" : "en");

export async function generateMetadata(): Promise<Metadata> {
  if (!bigProjectsEnabled()) return { robots: { index: false, follow: false } };
  const locale = (await getLocale()) as Locale;
  const c = COPY[lang(locale)];
  return pageMetadata({ path: "/projects", locale, indexedLocales: ["en", "ur"], title: c.metaTitle, description: c.metaDesc, keywords: ["house wiring contractor Karachi", "complete house wiring cost Pakistan", "plumbing contractor new house Lahore", "house renovation contractor Islamabad", "Servigic big projects"] });
}

export default async function ProjectsPage() {
  if (!bigProjectsEnabled()) notFound();
  const locale = (await getLocale()) as Locale;
  const c = COPY[lang(locale)];
  const settings = await getSiteSettingsPublic().catch(() => null);
  const wa = settings?.whatsappSupportNumber ? `https://wa.me/${settings.whatsappSupportNumber.replace(/\D/g, "")}` : null;
  const rtl = lang(locale) === "ur";

  const jsonLd = [
    { "@context": "https://schema.org", "@type": "Service", name: "Servigic Big Projects", serviceType: "Home construction and renovation trades coordination", provider: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") }, areaServed: SEO_CITIES.map((x) => ({ "@type": "City", name: x.name })), description: c.metaDesc },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "HowTo", name: c.stepsTitle, step: c.steps.map(([name, text], i) => ({ "@type": "HowToStep", position: i + 1, name, text })) },
    breadcrumbJsonLd([{ name: SITE_NAME, path: "/" }, { name: c.eyebrow, path: "/projects" }], locale),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <Navbar />
      <main id="main" className="flex-1 pb-24 md:pb-0" dir={rtl ? "rtl" : undefined}>
        <section className="relative isolate overflow-hidden py-14 md:py-20">
          <div className="sv-grid-bg absolute inset-0 -z-10" aria-hidden />
          <div className="container-x max-w-[900px] text-center">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h1 className="mx-auto max-w-3xl text-[clamp(30px,5.6vw,56px)] font-extrabold leading-[1.1] tracking-[-0.018em]">{c.h1}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-text-muted md:text-lg">{c.sub}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#estimate" className="inline-flex min-h-[48px] items-center rounded-full bg-gradient-to-b from-[#ffc24a] to-accent px-7 font-semibold text-accent-foreground">{c.cta}</a>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center rounded-full border border-accent px-7 font-semibold text-accent">{c.whatsapp}</a>}
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-2 text-sm text-text-muted">{c.trust.map((t) => <li key={t} className="rounded-full border border-border-subtle px-3 py-1.5">{t}</li>)}</ul>
          </div>
        </section>

        <section className="container-x max-w-[960px] py-10">
          <h2 className="mb-5 text-center text-xl font-bold md:text-2xl">{c.handleTitle}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {PROJECT_TRADES.map(([k, l]) => {
              const seo = SEO_TRADES.find((s) => s.key === k);
              const inner = <span className="sv-card block p-4 text-center text-sm font-semibold">{l}</span>;
              return <li key={k}>{seo ? <LLink href={`/projects/${seo.slug}/karachi`}>{inner}</LLink> : inner}</li>;
            })}
          </ul>
        </section>

        <section className="container-x max-w-[960px] py-10">
          <h2 className="mb-5 text-center text-xl font-bold md:text-2xl">{c.stepsTitle}</h2>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.steps.map(([t, d], i) => (
              <li key={t} className="sv-card p-5"><span className="text-sm font-bold text-accent">{i + 1}</span><h3 className="mt-1 font-bold">{t}</h3><p className="mt-1 text-sm text-text-muted">{d}</p></li>
            ))}
          </ol>
        </section>

        <section className="container-x max-w-[960px] py-10">
          <h2 className="mb-5 text-center text-xl font-bold md:text-2xl">{c.whyTitle}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{c.why.map(([t, d]) => <div key={t} className="sv-card p-5"><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm text-text-muted">{d}</p></div>)}</div>
          <p className="mt-6 text-center text-sm text-text-muted">{c.forTitle}: {c.forList.join(" - ")}</p>
        </section>

        <section className="container-x max-w-[760px] py-10">
          <h2 className="mb-2 text-center text-xl font-bold md:text-2xl">{c.sampleTitle}</h2>
          <p className="mb-4 text-center text-xs text-text-muted">{c.sampleNote}</p>
          <div className="sv-card p-5 text-sm" aria-label="Sample estimate">
            <div className="flex justify-between border-b border-border-subtle pb-2 font-semibold"><span>Item</span><span>Amount</span></div>
            {["Concealed wiring - ground floor", "Distribution board and earthing", "Bathrooms - plumbing lines"].map((x) => <div key={x} className="flex justify-between border-b border-border-subtle py-2 text-text-muted"><span>{x}</span><span>PKR ---</span></div>)}
            <div className="flex justify-between pt-3 font-bold"><span>Total</span><span>PKR ---</span></div>
          </div>
        </section>

        <section className="container-x max-w-[760px] py-10">
          <h2 className="mb-5 text-center text-xl font-bold md:text-2xl">{c.faqTitle}</h2>
          <div className="flex flex-col gap-2">{c.faq.map((f) => <details key={f.q} className="sv-card group p-4"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-2 text-sm text-text-muted">{f.a}</p></details>)}</div>
        </section>

        <section id="estimate" className="container-x max-w-[760px] scroll-mt-20 py-10">
          <h2 className="mb-5 text-center text-xl font-bold md:text-2xl">{c.formTitle}</h2>
          <ProjectForm whatsapp={settings?.whatsappSupportNumber ?? null} />
        </section>

        <section className="container-x max-w-[760px] pb-10 text-center text-sm text-text-muted">
          {SEO_TRADES.map((t) => <span key={t.slug} className="me-3 inline-block">{SEO_CITIES.map((x) => <LLink key={x.slug} href={`/projects/${t.slug}/${x.slug}`} className="me-2 underline">{t.name} {x.name}</LLink>)}</span>)}
        </section>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border-subtle bg-bg/95 p-3 backdrop-blur md:hidden">
        <a href="#estimate" className="flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">{c.cta}</a>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-accent font-semibold text-accent">{c.whatsapp}</a>}
      </div>
      <Footer />
    </>
  );
}

