-- CreateTable
CREATE TABLE "LinkedAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "googleSubject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "encryptedRefreshToken" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "scopes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedCalendar" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "googleCalendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "direction" TEXT NOT NULL DEFAULT 'off',
    "syncToken" TEXT,
    "lastPulledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkedAccount_userId_googleSubject_key" ON "LinkedAccount"("userId", "googleSubject");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedCalendar_accountId_googleCalendarId_key" ON "LinkedCalendar"("accountId", "googleCalendarId");

-- AddForeignKey
ALTER TABLE "LinkedAccount" ADD CONSTRAINT "LinkedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedCalendar" ADD CONSTRAINT "LinkedCalendar_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LinkedAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
