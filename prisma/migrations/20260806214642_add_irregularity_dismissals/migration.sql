-- CreateTable
CREATE TABLE "IrregularityDismissal" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IrregularityDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IrregularityDismissal_fingerprint_key" ON "IrregularityDismissal"("fingerprint");

-- CreateIndex
CREATE INDEX "IrregularityDismissal_kind_idx" ON "IrregularityDismissal"("kind");
