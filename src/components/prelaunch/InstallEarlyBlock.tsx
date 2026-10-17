"use client";

import { useTranslations } from "next-intl";
import type { PrelaunchPublic } from "@/lib/prelaunchPublic";

/**
 * Pakistan Pros: install the Pro app early through Google Play's testing track. Each step has its own button and a
 * button whose link is empty stays hidden; the whole block is hidden until at least one link is filled in.
 */
export function InstallEarlyBlock({ config }: { config: Pick<PrelaunchPublic, "proTesterGroupUrl" | "proTestingOptInUrl" | "proStoreUrl"> }) {
  const t = useTranslations("prelaunch");
  const steps = [
    { text: t("pro_install_step1"), label: t("pro_install_btn1"), url: config.proTesterGroupUrl, id: "tester-group" },
    { text: t("pro_install_step2"), label: t("pro_install_btn2"), url: config.proTestingOptInUrl, id: "opt-in" },
    { text: t("pro_install_step3"), label: t("pro_install_btn3"), url: config.proStoreUrl, id: "play-store" },
  ];
  if (!steps.some((s) => s.url)) return null;

  return (
    <div className="rounded-[14px] border border-accent/30 bg-accent/[0.07] p-4" data-testid="install-early">
      <h3 className="mb-3 text-base font-bold">{t("pro_install_title")}</h3>
      <ol className="flex flex-col gap-4 text-[14px] text-text-muted">
        {steps.map((s) => (
          <li key={s.id}>
            <p>{s.text}</p>
            {s.url && (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`install-${s.id}`}
                className="mt-2 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
              >
                {s.label}
              </a>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[12.5px] text-text-muted">{t("pro_install_note")}</p>
    </div>
  );
}
