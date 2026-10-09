-- CreateTable
CREATE TABLE "AssistantRequest" (
    "id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ip" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantChange" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantRequest_createdAt_idx" ON "AssistantRequest"("createdAt");

-- CreateIndex
CREATE INDEX "AssistantChange_model_recordId_idx" ON "AssistantChange"("model", "recordId");

-- CreateIndex
CREATE INDEX "AssistantChange_requestId_idx" ON "AssistantChange"("requestId");

-- AddForeignKey
ALTER TABLE "AssistantChange" ADD CONSTRAINT "AssistantChange_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AssistantRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
