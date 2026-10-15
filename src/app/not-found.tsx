import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import { LogoMark3D } from "@/components/brand/LogoMark3D";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <>
      <Navbar />
      <main id="main" className="flex flex-1 items-center justify-center px-5 py-20 text-center">
        <div className="flex max-w-md flex-col items-center">
          <LogoMark3D size={96} />
          <p className="mt-4 font-mono text-sm tracking-[0.3em] text-accent">404</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.018em] md:text-4xl">{t("title")}</h1>
          <p className="mt-3 text-text-muted">{t("desc")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button href="/">{t("home")}</Button>
            <Button href="/services" variant="ghost">
              {t("services")}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
