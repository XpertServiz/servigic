export interface AgreementDoc {
  kind: string;
  role: string;
  country: string;
  countryName: string;
  version: string;
  title: string;
  summary: string[];
  sections: { title: string; paragraphs: string[] }[];
  hash: string;
}

/** The full text of a Customer Terms / Pro Agreement (always in English, the governing language). */
export function AgreementBody({ doc, compact = false }: { doc: AgreementDoc; compact?: boolean }) {
  return (
    <div dir="ltr" lang="en" className={compact ? "space-y-3 text-[13px] leading-relaxed" : "space-y-5 text-[15px] leading-relaxed"}>
      <div>
        <h2 className={compact ? "text-base font-bold" : "text-2xl font-bold"}>{doc.title}</h2>
        <p className="text-xs text-text-muted">Version {doc.version}</p>
      </div>
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">Key points</div>
        <ul className="list-disc space-y-1 ps-5">
          {doc.summary.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      {doc.sections.map((s) => (
        <section key={s.title} className="break-inside-avoid">
          <h3 className="mb-1 font-bold">{s.title}</h3>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mb-2 text-text-muted print:text-black">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
