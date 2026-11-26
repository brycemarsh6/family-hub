import { z } from "zod";

// Request shapes for the Assistant API's Rewards reads. Pure (zod only),
// `.strict()`: an unknown query key is a 400, not ignored.

export const rewardsQuery = z.object({ personId: z.string().min(1).optional() }).strict();

export const rewardsHistoryQuery = z.object({ personId: z.string().min(1) }).strict();
