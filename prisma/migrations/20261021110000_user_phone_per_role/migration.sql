-- One phone number (and one email) can now hold a customer account and a pro account.
DROP INDEX IF EXISTS "User_phone_key";
DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_role_key" ON "User"("phone", "role");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_role_key" ON "User"("email", "role");
