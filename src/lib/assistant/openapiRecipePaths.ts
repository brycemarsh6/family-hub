import {
  recipeActionBody,
  recipeCreateBody,
  recipePatchBody,
  recipesListQuery,
  tagCreateBody,
} from "./schemasRecipes";
import type { Operation } from "./openapiTypes";

// The registry rows for the recipe and tag routes. Adding a route
// means adding its row here; openapi.test.ts fails until you do.

const LIST_ITEM =
  "{ id, title, rating, lastCookedAt, servings, prepTime, cookTime, totalMinutes, tags: [{id,name}], cookbooks: [{id,title}], shared }";

export const recipeOperations: Operation[] = [
  {
    method: "GET",
    path: "/recipes",
    action: "recipes.list",
    summary:
      "The recipes, title A to Z (best match first with q). q searches titles then ingredients; maxMinutes keeps recipes whose prep + cook time is at most that many minutes (a recipe whose times can't be read is left out).",
    query: recipesListQuery,
    response: `{ recipes: [${LIST_ITEM}] }`,
  },
  {
    method: "POST",
    path: "/recipes",
    action: "recipes.create",
    summary:
      "Add a recipe. ingredients and steps are arrays of one-line strings (at least one each). Optionally file it in a cookbook (cookbookId) and tag it (tagIds). Recipe delete is not offered; undo a mistake with POST /audit/{requestId}/undo.",
    body: recipeCreateBody,
    response: "201 { recipe } in the GET /recipes/{id} shape. 404 not_found naming the cookbook or tag that doesn't exist.",
  },
  {
    method: "GET",
    path: "/recipes/{id}",
    action: "recipes.get",
    summary: "One recipe in full: the list fields plus ingredients and steps (arrays of lines), notes, sourceUrl, shareUrl and nutrition.",
    response:
      "{ recipe: { ...list fields, ingredients, steps, notes, sourceUrl, shareUrl | null, nutrition: { calories, proteinG, carbsG, fatG, perServings, isEstimate: true, outdated } | null } }. " +
      "nutrition is an AI estimate; outdated means the ingredients changed since it was worked out. 404 if missing.",
  },
  {
    method: "PATCH",
    path: "/recipes/{id}",
    action: "recipes.update",
    summary:
      "Change any of title, ingredients, steps, servings, prepTime, cookTime, sourceUrl, notes, rating (1 to 5, or null to clear) and tagIds (the recipe's FULL tag set; tags left out are taken off). null clears an optional text field.",
    body: recipePatchBody,
    response: "{ recipe } in the detail shape. 404 if the recipe, or a tag in tagIds, doesn't exist.",
  },
  {
    method: "POST",
    path: "/recipes/{id}/cooked",
    action: "recipes.cooked",
    summary: "Mark the recipe cooked now (replaces any earlier cooked time). Send {}.",
    body: recipeActionBody,
    response: "{ recipe: { id, lastCookedAt } }. 404 if missing.",
  },
  {
    method: "POST",
    path: "/recipes/{id}/share",
    action: "recipes.share",
    summary:
      "Turn the recipe's public share link on (anyone with the link can read it, no login). Already shared keeps the same link. Send {}.",
    body: recipeActionBody,
    response: "{ shareUrl }. 404 if missing.",
  },
  {
    method: "DELETE",
    path: "/recipes/{id}/share",
    action: "recipes.stopSharing",
    summary: "Turn the share link off; the old link stops working.",
    response: "{ shareUrl: null }. 404 if missing.",
  },
  {
    method: "GET",
    path: "/recipes/{id}/shortfall",
    action: "recipes.shortfall",
    summary:
      "What the recipe needs that the house doesn't have: each ingredient line is read by the AI and checked against the inventory and the unchecked shopping list. Nothing is written; use POST /shopping to add the missing ones.",
    response:
      "{ recipeId, readable, have: [{line,name,matchedName}], missing: [{line,name}], onList: [{line,name}] }. " +
      "readable is false (lists empty) when the recipe has no ingredient lines or none could be read. " +
      "503 ai_unavailable (Retry-After 5) when the AI can't be reached; nothing is guessed. 404 if missing.",
  },
  {
    method: "GET",
    path: "/tags",
    action: "tags.list",
    summary: "The recipe tags, A to Z, with how many recipes carry each.",
    response: "{ tags: [{ id, name, recipeCount }] }",
  },
  {
    method: "POST",
    path: "/tags",
    action: "tags.create",
    summary: "Find a tag by name (ignoring capitals) or create it.",
    body: tagCreateBody,
    response: "201 { tag, created: true } for a new tag; 200 { tag, created: false } when it already existed.",
  },
];
