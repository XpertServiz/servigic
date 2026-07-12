-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Trade" ADD VALUE 'PEST_CONTROL';
ALTER TYPE "Trade" ADD VALUE 'ROOFING';
ALTER TYPE "Trade" ADD VALUE 'LOCKSMITH';
ALTER TYPE "Trade" ADD VALUE 'GARDENING';
ALTER TYPE "Trade" ADD VALUE 'TILING';
ALTER TYPE "Trade" ADD VALUE 'GENERATOR_REPAIR';
ALTER TYPE "Trade" ADD VALUE 'WATER_TANK_CLEANING';
ALTER TYPE "Trade" ADD VALUE 'GLASS_REPAIR';
ALTER TYPE "Trade" ADD VALUE 'WELDING';
ALTER TYPE "Trade" ADD VALUE 'UPHOLSTERY';
