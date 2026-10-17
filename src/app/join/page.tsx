import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { WaitlistForm } from "@/components/prelaunch/WaitlistForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("prelaunch");
  // The share link of the early list: useful to open, not meant to rank on its own.
  return { title: t("form_title"), robots: { index: false, follow: true } };
}

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1 py-10 md:py-16">
        <div className="container-x">
          <div className="mx-auto w-full max-w-[560px] rounded-[24px] border border-white/10 bg-bg-elevated p-5 shadow-2xl sm:p-7">
            <WaitlistForm initialRole={role === "pro" ? "PROVIDER" : "CUSTOMER"} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
