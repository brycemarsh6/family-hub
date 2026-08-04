-- CreateTable
CREATE TABLE "VoiceChange" (
    "id" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "pantryItemId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantityBefore" DOUBLE PRECISION,
    "quantityAfter" DOUBLE PRECISION,
    "undoneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceChange_createdAt_idx" ON "VoiceChange"("createdAt");

-- AddForeignKey
ALTER TABLE "VoiceChange" ADD CONSTRAINT "VoiceChange_pantryItemId_fkey" FOREIGN KEY ("pantryItemId") REFERENCES "PantryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
