-- CreateTable
CREATE TABLE "SlideshowPhoto" (
    "id" TEXT NOT NULL,
    "photoPath" TEXT NOT NULL,
    "thumbPath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "caption" TEXT,
    "takenOn" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlideshowPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlideshowPhoto_photoPath_key" ON "SlideshowPhoto"("photoPath");

-- CreateIndex
CREATE UNIQUE INDEX "SlideshowPhoto_thumbPath_key" ON "SlideshowPhoto"("thumbPath");

-- CreateIndex
CREATE INDEX "SlideshowPhoto_createdAt_idx" ON "SlideshowPhoto"("createdAt");
