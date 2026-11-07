import { z } from "zod";

// Request shapes for the Assistant API's cookbook routes. Pure (zod only),
// `.strict()` everywhere.

export const cookbookTitleBody = z
  .object({ title: z.string().trim().min(1).max(200) })
  .strict();

/** File, share: no input; an empty body or `{}` is fine. */
export const cookbookActionBody = z.object({}).strict().optional();
