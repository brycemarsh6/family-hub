import { assistantRoute } from "@/lib/assistant/assistantRoute";
import { buildOpenApiDocument } from "@/lib/assistant/openapi";

// Behind the bearer like everything else: the spec describes a private API.
export const GET = assistantRoute({
  action: "openapi.get",
  handler: async () => ({ data: buildOpenApiDocument() }),
});
