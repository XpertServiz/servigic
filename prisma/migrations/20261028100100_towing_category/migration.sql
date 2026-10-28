-- The Car Towing & Roadside Assistance service: the category, its sub-services, and switched on in every market where Car Mechanic is.
INSERT INTO "ServiceCategory" ("id", "trade", "name", "slug", "icon", "description", "activeCities", "minPricePKR")
SELECT gen_random_uuid()::text, 'TOWING', 'Car Towing & Roadside Assistance', 'car-towing', '🚛',
       'Broken down? A tow truck or roadside help, 24/7: towing, flat tyre, jump start, fuel delivery, car lockout and vehicle recovery.',
       COALESCE((SELECT "activeCities" FROM "ServiceCategory" WHERE "trade" = 'CAR_MECHANIC'), ARRAY[]::TEXT[]), 3000
WHERE NOT EXISTS (SELECT 1 FROM "ServiceCategory" WHERE "trade" = 'TOWING');

INSERT INTO "SubService" ("id", "categoryId", "name", "slug", "active")
SELECT gen_random_uuid()::text, c."id", s."name", s."slug", true
FROM "ServiceCategory" c
CROSS JOIN (VALUES
  ('Car towing (tow truck)', 'car-towing'),
  ('Flat tyre change', 'flat-tyre'),
  ('Jump start / battery', 'jump-start'),
  ('Fuel delivery', 'fuel-delivery'),
  ('Car lockout (keys locked inside)', 'car-lockout'),
  ('Vehicle recovery (stuck / accident)', 'vehicle-recovery')
) AS s("name", "slug")
WHERE c."trade" = 'TOWING'
ON CONFLICT ("categoryId", "slug") DO NOTHING;

INSERT INTO "MarketCategory" ("id", "marketId", "trade", "enabled", "targetPros")
SELECT gen_random_uuid()::text, mc."marketId", 'TOWING', true, 10
FROM "MarketCategory" mc
WHERE mc."trade" = 'CAR_MECHANIC'
ON CONFLICT ("marketId", "trade") DO NOTHING;
