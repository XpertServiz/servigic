import { unstable_cache } from "next/cache";
import { getPrelaunchConfig } from "@/lib/prelaunch";
import { foundingSlotsLeft } from "@/lib/foundingPro";

// What the public site needs to know about the pre-launch state. Cached for a minute (it is read on every page);
// changing a switch in Admin > Settings shows up on the site within about a minute. Never includes the notify email.
export interface PrelaunchPublic {
  proAppLive: boolean;
  customerAppLive: boolean;
  proTesterGroupUrl: string | null;
  proTestingOptInUrl: string | null;
  customerPreregUrl: string | null;
  proStoreUrl: string | null;
  customerStoreUrl: string | null;
  /** True while Founding Pro places remain (the website offer is hidden once they are filled). */
  foundingOpen: boolean;
  foundingLeft: number;
  foundingCity: string;
}

export const getPrelaunchPublic = unstable_cache(
  async (): Promise<PrelaunchPublic> => {
    const [cfg, founding] = await Promise.all([getPrelaunchConfig(), foundingSlotsLeft()]);
    return {
      proAppLive: cfg.proAppLive,
      customerAppLive: cfg.customerAppLive,
      proTesterGroupUrl: cfg.proTesterGroupUrl,
      proTestingOptInUrl: cfg.proTestingOptInUrl,
      customerPreregUrl: cfg.customerPreregUrl,
      proStoreUrl: cfg.proStoreUrl,
      customerStoreUrl: cfg.customerStoreUrl,
      foundingOpen: founding.left > 0,
      foundingLeft: founding.left,
      foundingCity: founding.rule.city,
    };
  },
  ["prelaunch-public"],
  { revalidate: 60 },
);
