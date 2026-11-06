import { summaryQuery } from "./schemas";
import type { Operation } from "./openapiTypes";

// The registry row for /summary. Adding a route means adding its row here.

export const summaryOperations: Operation[] = [
  {
    method: "GET",
    path: "/summary",
    action: "summary.get",
    summary:
      "The state of the house on one day (default: today in the household's zone): the day's meals (all four slots), inventory counts (total/low/out/expiring within 3 days), unchecked shopping items by store, recipe count, and today's and tomorrow's calendar events. Tasks join the calendar section in a later release.",
    query: summaryQuery,
    response:
      "{ date, meals: [{slot,title,recipeId}], inventory: {total,low,out,expiring}, shopping: {toBuy,byStore}, recipes: {count}, calendar: {today:{date,events},tomorrow:{date,events}} }",
  },
];
