import { getTranslations } from "next-intl/server";
import { getPrelaunchPublic } from "@/lib/prelaunchPublic";
import { getVisitorGeo } from "@/lib/visitorGeo";
import { Reveal } from "@/components/ui/Reveal";
import { InstallEarlyBlock } from "./InstallEarlyBlock";
import { AppDownloadButton } from "./AppDownloadButton";

/** The Pro-page block: the 12% comparison, the Founding Pro offer (while places remain), the Join button and, for Pakistan, install-early. */
export async function ProEarlyAccess() {
  const [t, cfg, geo] = await Promise.all([getTranslations("prelaunch"), getPrelaunchPublic(), getVisitorGeo()]);
  const inPakistan = geo.country === "PK";
  return (
    <section className="container-x max-w-[760px] pb-4 pt-2 text-center">
      <Reveal>
        <div className="rounded-3xl border border-accent/30 bg-accent/[0.07] p-6 md:p-8">
          <p className="text-base text-text md:text-lg">{t("pro_commission_compare")}</p>
          {inPakistan && cfg.foundingOpen && <p className="mt-4 text-sm leading-relaxed text-accent">{t("offer_pro")}</p>}
          <div className="mt-6 flex justify-center">
            <AppDownloadButton app="pro" />
          </div>
          {inPakistan && !cfg.proAppLive && (
            <div className="mt-6 text-start">
              <InstallEarlyBlock config={cfg} />
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}
