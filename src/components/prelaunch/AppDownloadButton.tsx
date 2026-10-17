import { getTranslations } from "next-intl/server";
import { getPrelaunchPublic } from "@/lib/prelaunchPublic";
import { JoinListButton } from "./JoinListButton";

/**
 * The one place an app download button is made. Until the app is switched live in Admin > Settings it shows
 * "Join the list"; once live it links to Google Play (and stays hidden if the Play link is not filled in).
 */
export async function AppDownloadButton({ app, variant = "primary", size = "lg" }: { app: "customer" | "pro"; variant?: "primary" | "ghost"; size?: "md" | "lg" }) {
  const cfg = await getPrelaunchPublic();
  const live = app === "pro" ? cfg.proAppLive : cfg.customerAppLive;
  if (!live) return <JoinListButton role={app === "pro" ? "PROVIDER" : "CUSTOMER"} variant={variant} size={size} />;
  const url = app === "pro" ? cfg.proStoreUrl : cfg.customerStoreUrl;
  if (!url) return null;
  const t = await getTranslations("prelaunch");
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-transform hover:-translate-y-0.5 ${
        size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-[15px]"
      } ${variant === "primary" ? "bg-gradient-to-b from-[#ffc24a] to-accent text-accent-foreground" : "border border-white/12 bg-white/[0.03] text-text hover:border-accent/60 hover:text-accent"}`}
    >
      {t("get_on_play")}
    </a>
  );
}
