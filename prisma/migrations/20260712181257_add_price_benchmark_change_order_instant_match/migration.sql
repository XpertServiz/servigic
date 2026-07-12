-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('BID', 'INSTANT');

-- CreateEnum
CREATE TYPE "ChangeOrderStatus" AS ENUM ('PENDING', 'DECLINED', 'AWAITING_PAYMENT', 'PAID', 'CONFIRMED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "matchType" "MatchType" NOT NULL DEFAULT 'BID';

-- CreateTable
CREATE TABLE "PriceBenchmark" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subServiceId" TEXT,
    "city" TEXT NOT NULL,
    "windowDays" INTEGER NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "avgWinningPKR" INTEGER NOT NULL,
    "medianWinningPKR" INTEGER NOT NULL,
    "minPKR" INTEGER NOT NULL,
    "maxPKR" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "extraAmountPKR" INTEGER NOT NULL,
    "status" "ChangeOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod",
    "proofImageUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceBenchmark_categoryId_city_windowDays_idx" ON "PriceBenchmark"("categoryId", "city", "windowDays");

-- CreateIndex
CREATE INDEX "ChangeOrder_bookingId_idx" ON "ChangeOrder"("bookingId");

-- CreateIndex
CREATE INDEX "ChangeOrder_status_idx" ON "ChangeOrder"("status");

-- AddForeignKey
ALTER TABLE "PriceBenchmark" ADD CONSTRAINT "PriceBenchmark_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBenchmark" ADD CONSTRAINT "PriceBenchmark_subServiceId_fkey" FOREIGN KEY ("subServiceId") REFERENCES "SubService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
