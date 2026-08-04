-- AlterTable
ALTER TABLE "PantryItem" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "restockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "PantryItem_expiresAt_idx" ON "PantryItem"("expiresAt");
