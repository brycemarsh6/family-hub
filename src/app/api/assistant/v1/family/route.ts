import { assistantRoute } from "@/lib/assistant/route";
import { toFamilyMember } from "@/lib/assistant/serialize";
import { db } from "@/lib/db";

export const GET = assistantRoute({
  action: "family.list",
  handler: async () => {
    // A narrow select on purpose — never PERSON_SELECT, which includes
    // passwordHash. toFamilyMember also builds field by field.
    const rows = await db.user.findMany({
      select: { id: true, displayName: true, role: true, deactivatedAt: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return { data: { members: rows.map(toFamilyMember) } };
  },
});
