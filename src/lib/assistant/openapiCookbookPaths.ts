import { cookbookActionBody, cookbookTitleBody } from "./schemasCookbooks";
import type { Operation } from "./openapiTypes";

// The registry rows for the cookbook routes. Adding a route means adding its
// row here; openapi.test.ts fails until you do.

const COOKBOOK = "{ id, title, recipeCount, shared }";

export const cookbookOperations: Operation[] = [
  {
    method: "GET",
    path: "/cookbooks",
    action: "cookbooks.list",
    summary: "The cookbooks, A to Z, with how many recipes each holds and whether it has a public share link.",
    response: `{ cookbooks: [${COOKBOOK}] }`,
  },
  {
    method: "GET",
    path: "/cookbooks/{id}",
    action: "cookbooks.get",
    summary:
      "One cookbook with its recipes, newest filing first. createdByAssistant is true for cookbooks Winnie made (the only ones she may delete).",
    response:
      "{ cookbook: { id, title, recipeCount, shared, shareUrl | null, createdByAssistant, recipes: [{ id, title, addedAt }] } }. 404 if missing.",
  },
  {
    method: "POST",
    path: "/cookbooks",
    action: "cookbooks.create",
    summary:
      "Find a cookbook by title (ignoring capitals; the oldest if several match) or create an empty one. File recipes with PUT /cookbooks/{id}/recipes/{recipeId}.",
    body: cookbookTitleBody,
    response: "201 { cookbook, created: true } for a new cookbook; 200 { cookbook, created: false } when one already had that title.",
  },
  {
    method: "PATCH",
    path: "/cookbooks/{id}",
    action: "cookbooks.rename",
    summary: "Rename a cookbook (any cookbook, the family's too). Another cookbook may have the same title.",
    body: cookbookTitleBody,
    response: `{ cookbook: ${COOKBOOK} }. 404 if missing.`,
  },
  {
    method: "DELETE",
    path: "/cookbooks/{id}",
    action: "cookbooks.delete",
    summary:
      "Delete a cookbook Winnie created, and her own filings in it; the recipes themselves are never deleted. Undo brings the cookbook and the filings back.",
    response:
      "{ deleted: true, unfiled: <n> }. 403 forbidden for a cookbook she didn't create. 409 conflict when the family has filed any recipe in it (nothing is changed). 404 if missing.",
  },
  {
    method: "PUT",
    path: "/cookbooks/{id}/recipes/{recipeId}",
    action: "cookbooks.fileRecipe",
    summary:
      "File a recipe in a cookbook. Already filed is fine and changes nothing. If the cookbook has a share link, the recipe becomes visible there too. Send {}.",
    body: cookbookActionBody,
    response: "{ filed: true }. 404 if the cookbook or the recipe is missing.",
  },
  {
    method: "DELETE",
    path: "/cookbooks/{id}/recipes/{recipeId}",
    action: "cookbooks.unfileRecipe",
    summary: "Take a recipe out of a cookbook (any cookbook). The recipe itself is not touched.",
    response: "{ removed: boolean } (false when it wasn't filed there).",
  },
  {
    method: "POST",
    path: "/cookbooks/{id}/share",
    action: "cookbooks.share",
    summary:
      "Turn the cookbook's public share link on (anyone with the link can read it, no login). The link shows the cookbook's current contents, so recipes filed in it later become public too. Already shared keeps the same link. Send {}.",
    body: cookbookActionBody,
    response: "{ shareUrl }. 404 if missing.",
  },
  {
    method: "DELETE",
    path: "/cookbooks/{id}/share",
    action: "cookbooks.stopSharing",
    summary: "Turn the share link off; the old link stops working.",
    response: "{ shareUrl: null }. 404 if missing.",
  },
];
