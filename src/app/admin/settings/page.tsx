import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 font-display text-3xl font-bold">Settings</h1>
      <p className="mb-8 text-text-muted">Theme, support number, and default commission.</p>
      <SettingsForm
        initial={{
          activeTheme: settings?.activeTheme ?? "electric-amber",
          defaultCommissionPct: settings?.defaultCommissionPct ?? 12,
          whatsappSupportNumber: settings?.whatsappSupportNumber ?? "",
        }}
      />
    </div>
  );
}
