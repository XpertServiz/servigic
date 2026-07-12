import { prisma } from "@/lib/prisma";
import { getFeatureFlags } from "@/lib/featureFlags";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const [settings, featureFlags] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    getFeatureFlags(),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 font-display text-3xl font-bold">Settings</h1>
      <p className="mb-8 text-text-muted">Theme, support number, default commission, and AI agents.</p>
      <SettingsForm
        initial={{
          activeTheme: settings?.activeTheme ?? "electric-amber",
          defaultCommissionPct: settings?.defaultCommissionPct ?? 12,
          whatsappSupportNumber: settings?.whatsappSupportNumber ?? "",
          featureFlags,
        }}
      />
    </div>
  );
}
