"use client";

import { useTranslations } from "next-intl";
import type { PrelaunchPublic } from "@/lib/prelaunchPublic";

/**
 * Install the Pro app (or, with app="customer", the Customer app) early through Google Play's testing track. Each step has its own button and a
 * button whose link is empty stays hidden; the whole block is hidden until at least one link is filled in.
 */
type Links = Pick<PrelaunchPublic, "proTesterGroupUrl" | "proTestingOptInUrl" | "proStoreUrl"> &
  Partial<Pick<PrelaunchPublic, "customerTesterGroupUrl" | "customerTestingOptInUrl" | "customerStoreUrl">>;

export function InstallEarlyBlock({ config, app = "pro" }: { config: Links; app?: "pro" | "customer" }) {
  const t = useTranslations("prelaunch");
  const k = app === "customer" ? "customer_install" : "pro_install";
  const urls =
    app === "customer"
      ? [config.customerTesterGroupUrl ?? null, config.customerTestingOptInUrl ?? null, config.customerStoreUrl ?? null]
      : [config.proTesterGroupUrl, config.proTestingOptInUrl, config.proStoreUrl];
  const steps = [
    { text: t(`${k}_step1`), label: t(`${k}_btn1`), url: urls[0], id: "tester-group" },
    { text: t(`${k}_step2`), label: t(`${k}_btn2`), url: urls[1], id: "opt-in" },
    { text: t(`${k}_step3`), label: t(`${k}_btn3`), url: urls[2], id: "play-store" },
  ];
  if (!steps.some((s) => s.url)) return null;

  return (
    <div className="rounded-[14px] border border-accent/30 bg-accent/[0.07] p-4" data-testid="install-early">
      <h3 className="mb-3 text-base font-bold">{t(`${k}_title`)}</h3>
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
      <p className="mt-3 text-[12.5px] text-text-muted">{t(`${k}_note`)}</p>
    </div>
  );
}
