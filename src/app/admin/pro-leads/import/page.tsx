import Link from "next/link";
import { ImportWizard } from "./ImportWizard";

export const dynamic = "force-dynamic";

export default function ImportLeadsPage() {
  return (
    <div className="max-w-5xl">
      <Link href="/admin/pro-leads" className="text-sm text-text-muted hover:text-text">← Pro Leads</Link>
      <h1 className="mb-1 mt-2 font-display text-3xl font-bold">Import leads</h1>
      <p className="mb-6 max-w-3xl text-text-muted">
        Upload a CSV or Excel file (from OLX, a Google Maps list, a market visit, a referral sheet). Pick which column is which, check the preview, then import. A phone number that is already a lead is
        updated, not duplicated: the first source is kept and the new one is added. Numbers are turned into +92… format; trades are guessed from words like &quot;bijli wala&quot;, &quot;AC repair&quot;, &quot;nalka&quot;.
      </p>
      <ImportWizard />
    </div>
  );
}
