-- The towing rows were created with UUID ids, but the apps and the job form expect the project's own id format (starts with "c", no hyphens).
UPDATE "ServiceCategory" SET "id" = 'c' || replace(gen_random_uuid()::text, '-', '') WHERE "trade" = 'TOWING' AND "id" LIKE '%-%';
UPDATE "SubService" SET "id" = 'c' || replace(gen_random_uuid()::text, '-', '') WHERE "id" LIKE '%-%';
UPDATE "MarketCategory" SET "id" = 'c' || replace(gen_random_uuid()::text, '-', '') WHERE "trade" = 'TOWING' AND "id" LIKE '%-%';
