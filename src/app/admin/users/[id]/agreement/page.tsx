import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/legal/PrintButton";

// The signed copy of a user's Customer Terms / Pro Agreement exactly as accepted, with the e-signature evidence
// (name typed, date and time, IP address, device). Print or save as PDF to send to the person, a lawyer or a court.
export default async function SignedAgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, phone: true, email: true, role: true, termsAcceptances: { orderBy: { acceptedAt: "desc" } } },
  });
  if (!user) notFound();
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="font-display text-3xl font-bold">Signed agreements</h1>
        <PrintButton label="Print / save as PDF" />
      </div>
      <p className="mb-6 text-text-muted">
        {user.name} · {user.role === "PROVIDER" ? "Pro" : "Customer"} · {user.phone}
        {user.email ? ` · ${user.email}` : ""}
      </p>
      {user.termsAcceptances.length === 0 && <p className="text-danger">This account has not signed an agreement yet.</p>}
      {user.termsAcceptances.map((a) => (
        <article key={a.id} className="mb-10 rounded-[14px] border border-border-subtle p-5 print:border-0 print:p-0">
          <table className="mb-5 w-full text-sm">
            <tbody>
              {[
                ["Document", `${a.document === "PRO_AGREEMENT" ? "Pro Agreement" : "Customer Terms"} (${a.country}) · version ${a.version}`],
                ["Signed by (typed name)", a.signedName],
                ["Date and time (UTC)", a.acceptedAt.toISOString().replace("T", " ").slice(0, 19)],
                ["IP address", a.ip ?? "—"],
                ["Device", a.userAgent ?? "—"],
                ["Channel", a.source === "app" ? "Mobile app" : "Website"],
                ["Text fingerprint (SHA-256)", a.docHash],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-border-subtle align-top">
                  <td className="w-56 py-1.5 pe-3 font-semibold">{k}</td>
                  <td className="break-all py-1.5 text-text-muted">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">{a.documentText}</pre>
        </article>
      ))}
    </div>
  );
}
