-- Additive: when the last pull of a calendar worked (lastPulledAt stays the lease stamp).
ALTER TABLE "LinkedCalendar" ADD COLUMN "lastPulledOkAt" TIMESTAMP(3);
