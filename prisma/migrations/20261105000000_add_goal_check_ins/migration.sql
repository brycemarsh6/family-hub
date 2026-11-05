-- CreateTable
CREATE TABLE "GoalCheckIn" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "GoalCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalCheckIn_goalId_at_idx" ON "GoalCheckIn"("goalId", "at");

-- AddForeignKey
ALTER TABLE "GoalCheckIn" ADD CONSTRAINT "GoalCheckIn_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalCheckIn" ADD CONSTRAINT "GoalCheckIn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: each goal's saved latest number becomes its first history entry
-- (Bryce's decision, mission 29), so the history starts with what is already known.
INSERT INTO "GoalCheckIn" ("id", "goalId", "value", "at")
SELECT 'ci_' || "id", "id", "currentValue", "checkedInAt" FROM "Goal"
WHERE "currentValue" IS NOT NULL AND "checkedInAt" IS NOT NULL;
