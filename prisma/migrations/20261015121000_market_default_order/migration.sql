-- The first market of a country is its default when only the IP country is known (see
-- src/lib/marketConfig.ts: markets are read in createdAt order). Make Karachi the Pakistani default.
UPDATE "Market" SET "createdAt" = CURRENT_TIMESTAMP - interval '3 minutes' WHERE "id" = 'mkt_pk_karachi';
UPDATE "Market" SET "createdAt" = CURRENT_TIMESTAMP - interval '2 minutes' WHERE "id" = 'mkt_pk_lahore';
UPDATE "Market" SET "createdAt" = CURRENT_TIMESTAMP - interval '1 minute' WHERE "id" = 'mkt_pk_islamabad';
