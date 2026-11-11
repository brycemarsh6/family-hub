-- AlterTable
ALTER TABLE "CalendarEventSync" ADD COLUMN "googleSeriesId" TEXT;

-- Backfill trigger: a cleared token makes the next pull a full-window pull,
-- which fills googleSeriesId on existing rows. Nothing is deleted.
UPDATE "LinkedCalendar" SET "syncToken" = NULL WHERE "direction" = 'twoWay';
