// The caller's IP address, read from the request headers. Pure: it only looks
// at the headers it is handed (pass `await headers()`), so it needs no
// "server-only" guard.

/** First hop of x-forwarded-for, best-effort, not a guarantee (see the
 * plan's "honest limits": the per-user cap is the real bound). Empty
 * string locally, where there's no proxy in front of the dev server to
 * set the header at all. */
export function clientIp(headerList: { get(name: string): string | null }): string {
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
}
