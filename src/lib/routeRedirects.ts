// Old URLs that now forward to a drawer destination. No imports on purpose:
// next.config.ts imports this file by relative path, and config can't pull
// in app code. Sources must never be a nav href (a redirect would hide the
// page); destinations must always be one. routeRedirects.test.ts pins both.
export const LEGACY_ROUTE_REDIRECTS = [
  { source: "/kitchen", destination: "/kitchen/inventory" },
  { source: "/kitchen/cooking", destination: "/kitchen/cooking/recipes" },
  { source: "/routines", destination: "/habits" },
  { source: "/chores", destination: "/habits" },
] as const;
