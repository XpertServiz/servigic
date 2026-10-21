-- Staff level for admins (existing admins stay super_admin).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminLevel" TEXT NOT NULL DEFAULT 'super_admin';
