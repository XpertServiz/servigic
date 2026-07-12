// Geo-Localized Landing Page Addendum v5 §6 — legal text is data, not
// code: it comes straight from LocaleConfig.legalDisclaimer so a legal
// review/update never requires a redeploy.
export function LegalDisclaimer({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  return <p className={`text-xs leading-relaxed text-text-dim text-text-muted ${className}`}>{text}</p>;
}
