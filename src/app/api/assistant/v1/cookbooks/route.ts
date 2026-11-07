import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { listCookbooks } from "@/lib/assistant/recipeReads";

export const GET = assistantRoute({
  action: "cookbooks.list",
  handler: async () => ({ data: { cookbooks: await listCookbooks() } }),
});
