-- CreateTable
CREATE TABLE "ScreensaverSettings" (
    "id" TEXT NOT NULL DEFAULT 'household',
    "startAfterMinutes" INTEGER NOT NULL DEFAULT 30,
    "secondsPerPhoto" INTEGER NOT NULL DEFAULT 15,
    "showClock" BOOLEAN NOT NULL DEFAULT true,
    "showCaption" BOOLEAN NOT NULL DEFAULT true,
    "showTakenOn" BOOLEAN NOT NULL DEFAULT true,
    "sleepEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sleepStartMinute" INTEGER NOT NULL DEFAULT 1320,
    "sleepEndMinute" INTEGER NOT NULL DEFAULT 360,
    "backToBlackMinutes" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ScreensaverSettings_pkey" PRIMARY KEY ("id")
);
