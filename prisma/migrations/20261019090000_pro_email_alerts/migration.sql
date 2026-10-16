-- Offline-pro job-alert emails: per-pro opt-out.
ALTER TABLE "ProviderProfile" ADD COLUMN "emailAlerts" BOOLEAN NOT NULL DEFAULT true;
