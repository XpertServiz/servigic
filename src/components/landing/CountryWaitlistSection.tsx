"use client";

import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/landing/Eyebrow";
import { JoinListButton } from "@/components/prelaunch/JoinListButton";

// For visitors from a country that is not live yet: the same single early list as everywhere else on the site.
export function CountryWaitlistSection({ countryName }: { countryCode: string; countryName: string }) {
  const t = useTranslations("waitlist");
  return (
    <section id="waitlist" className="container-x max-w-[720px] py-16 text-center md:py-20">
      <Eyebrow>{t("eyebrow", { country: countryName })}</Eyebrow>
      <h2 className="mb-4 text-[clamp(26px,4.2vw,42px)] font-bold leading-tight tracking-[-0.018em]">{t("title")}</h2>
      <p className="mb-8 text-text-muted">{t("desc", { country: countryName })}</p>
      <JoinListButton role="CUSTOMER" />
    </section>
  );
}
