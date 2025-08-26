-- CreateEnum
CREATE TYPE "public"."PrizeStatus" AS ENUM ('PENDING_ADMIN_OPEN', 'OPENED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('NEW_PAYMENT', 'PRIZE_OPENED', 'PRIZE_DELIVERED', 'PAYMENT_FAILED', 'SYSTEM_ALERT');

-- CreateTable
CREATE TABLE "public"."PrizeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" INTEGER NOT NULL,
    "glow" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrizeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrizeClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "prizeTypeId" TEXT,
    "status" "public"."PrizeStatus" NOT NULL DEFAULT 'PENDING_ADMIN_OPEN',
    "openedBy" TEXT,
    "openedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrizeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminNotification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "prizeClaimId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrizeType_name_key" ON "public"."PrizeType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeClaim_paymentId_key" ON "public"."PrizeClaim"("paymentId");

-- AddForeignKey
ALTER TABLE "public"."PrizeClaim" ADD CONSTRAINT "PrizeClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrizeClaim" ADD CONSTRAINT "PrizeClaim_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrizeClaim" ADD CONSTRAINT "PrizeClaim_prizeTypeId_fkey" FOREIGN KEY ("prizeTypeId") REFERENCES "public"."PrizeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminNotification" ADD CONSTRAINT "AdminNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminNotification" ADD CONSTRAINT "AdminNotification_prizeClaimId_fkey" FOREIGN KEY ("prizeClaimId") REFERENCES "public"."PrizeClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
