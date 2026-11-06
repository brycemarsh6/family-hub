-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "userAgent" TEXT,
    "viewport" TEXT,
    "screenshot" BYTEA,
    "screenshotType" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_doneAt_createdAt_idx" ON "Feedback"("doneAt", "createdAt");
