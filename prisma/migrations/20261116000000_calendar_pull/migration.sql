-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "sourceLinkedCalendarId" TEXT;

-- CreateIndex
CREATE INDEX "CalendarEvent_sourceLinkedCalendarId_idx" ON "CalendarEvent"("sourceLinkedCalendarId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventSync_linkedCalendarId_googleEventId_key" ON "CalendarEventSync"("linkedCalendarId", "googleEventId");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_sourceLinkedCalendarId_fkey" FOREIGN KEY ("sourceLinkedCalendarId") REFERENCES "LinkedCalendar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

