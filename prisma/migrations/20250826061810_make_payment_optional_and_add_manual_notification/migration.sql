-- AlterEnum
ALTER TYPE "public"."NotificationType" ADD VALUE 'MANUAL_PRIZE_OPENED';

-- DropForeignKey
ALTER TABLE "public"."PrizeClaim" DROP CONSTRAINT "PrizeClaim_paymentId_fkey";

-- AlterTable
ALTER TABLE "public"."PrizeClaim" ALTER COLUMN "paymentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."PrizeClaim" ADD CONSTRAINT "PrizeClaim_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
