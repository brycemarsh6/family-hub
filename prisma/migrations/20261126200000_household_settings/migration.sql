-- CreateTable
CREATE TABLE "HouseholdSettings" (
    "id" TEXT NOT NULL DEFAULT 'household',
    "familyName" TEXT,
    "stores" TEXT,
    "setupFinishedAt" TIMESTAMP(3),
    "recoveryCodeHash" TEXT,
    "checklistDismissedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "HouseholdSettings_pkey" PRIMARY KEY ("id")
);
