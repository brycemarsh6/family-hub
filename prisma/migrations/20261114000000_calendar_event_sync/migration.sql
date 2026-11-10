-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "showBusyOnGoogle" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LinkedCalendar" ADD COLUMN     "accessRole" TEXT;

-- CreateTable
CREATE TABLE "CalendarEventSync" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "linkedCalendarId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "etag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failReason" TEXT,
    "lastPushedAt" TIMESTAMP(3),
    "lastPulledAt" TIMESTAMP(3),
    "previousJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEventSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEventSync_linkedCalendarId_idx" ON "CalendarEventSync"("linkedCalendarId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventSync_eventId_linkedCalendarId_key" ON "CalendarEventSync"("eventId", "linkedCalendarId");

-- AddForeignKey
ALTER TABLE "CalendarEventSync" ADD CONSTRAINT "CalendarEventSync_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventSync" ADD CONSTRAINT "CalendarEventSync_linkedCalendarId_fkey" FOREIGN KEY ("linkedCalendarId") REFERENCES "LinkedCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
