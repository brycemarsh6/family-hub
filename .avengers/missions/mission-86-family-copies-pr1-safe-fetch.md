# Mission 86: Family copies PR 1, safe fetch for recipe link import

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-26 · **Updated:** 2026-11-26

## Brief

- **Goal:** Recipe link import fetches any http(s) address and follows
  redirects, so a signed-in user could make the server fetch internal
  addresses (SSRF: for example the cloud metadata address 169.254.169.254).
  Close that before relatives get accounts (family-copies plan, PR 1:
  `.avengers/plans/family-copies-v1.md`).
- **Done means:** every fetch in `src/lib/recipeUrlImport.ts` (TikTok oEmbed,
  Pinterest pin, blog page, and the pin's outbound link) goes through a new
  `safeFetch`; `http://169.254.169.254/` and `http://localhost` are refused
  with a friendly error; a normal recipe blog link still imports locally;
  Gauntlet green, `npm test` and the direct `TZ=UTC` command both pass;
  Vision and Captain PASS.
- **Out of scope:** any screen or wording change beyond the refusal message;
  other server fetches (Google, Anthropic, Winnie webhook: fixed addresses,
  not user input); rate limiting.

## Danger register

AGENTS.md in full. For this mission: no database work at all, no migration,
no `.env` reads. Stage by explicit path, then `git show --stat HEAD`. Do not
fetch internal addresses for real during testing except `localhost` on this
machine (which must be refused before any connection).

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint src/lib/urlSafety.ts src/lib/urlSafety.test.ts src/lib/safeFetch.ts src/lib/recipeUrlImport.ts`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts src/lib/rewards/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Captain: two new files in `src/lib/`.
- Strange out: no screen changes (only an error message string).
- Banner out: one 416-line file, read inline by Fury.

## Contract C1: urlSafety + safeFetch, wired into link import

1. **Objective:** every server fetch in recipe link import refuses unsafe
   destinations, on the first request and on every redirect, and the
   connection goes to the exact address that was checked.
2. **Boundaries.**
   - May touch: `src/lib/urlSafety.ts` (new), `src/lib/urlSafety.test.ts`
     (new), `src/lib/safeFetch.ts` (new), `src/lib/recipeUrlImport.ts`.
   - Must not touch: `package.json` (no new dependency; the flat test file is
     already covered by the `src/lib/*.test.ts` glob), anything else.
3. **Rules for the code.**
   - `urlSafety.ts` is pure (no `server-only`, no network), so `node:test`
     can import it. It exports at least: `isSafeIpAddress(ip: string):
     boolean` and `checkUrl(url: URL | string): { ok: true; url: URL } |
     { ok: false; reason: string }`.
     Refuse: non http/https; username or password in the URL; an explicit
     port other than 80/443; IP literal hosts that are unsafe; hostnames
     `localhost` and `*.localhost`. Unsafe IPv4: 0.0.0.0/8, 10/8,
     100.64/10 (CGNAT), 127/8, 169.254/16, 172.16/12, 192.0.0/24,
     192.168/16, 198.18/15, 224/4 and above (multicast, reserved,
     255.255.255.255). Unsafe IPv6: `::`, `::1`, fc00::/7 (ULA), fe80::/10
     (link-local), ff00::/8 (multicast), IPv4-mapped `::ffff:a.b.c.d` and
     its hex form (judge by the inner IPv4; refuse if unparsable), NAT64
     64:ff9b::/96 judged by its inner IPv4 too. Strip `[ ]` from
     `URL.hostname` IPv6. Remember `new URL()` normalises odd IPv4 forms
     (`http://2130706433/`, `http://0x7f.1/`) to dotted form: test them.
   - `safeFetch.ts` starts with `import "server-only";`. It exports
     `safeFetch(url: string, options?: { headers?: Record<string,string>;
     timeoutMs?: number; maxBytes?: number; maxRedirects?: number })` that
     returns a standard `Response` (built from the buffered body) so the
     existing `ok`, `status`, `text()`, `json()` call sites keep working.
     Defaults: timeout 10 s across the whole chain, 2 MB body cap (refuse,
     do not truncate), 3 redirects max.
   - **DNS rebinding must be closed:** do not resolve, check, and then hand
     the hostname to `fetch` (which resolves again). Make the request with
     `node:http` / `node:https` and pass a custom `lookup` that resolves with
     `dns.lookup(host, { all: true })`, rejects if ANY returned address is
     unsafe, and hands the connection a checked address. Keep TLS SNI and
     certificate checks on the hostname (the default when `host` is the
     hostname and only `lookup` is replaced).
   - Redirects by hand: on 301/302/303/307/308 read `Location`, resolve it
     against the current URL, run `checkUrl` on it, then fetch it; more than
     3 hops is a refusal. Drain/destroy the redirect response body.
   - Decompress `gzip`, `deflate` and `br` bodies with `node:zlib` if the
     server sends them (count the 2 MB cap on the decompressed bytes).
   - Refusals throw a named error class (`UnsafeUrlError`) so the caller can
     tell "blocked" from "network failed".
   - In `recipeUrlImport.ts`: delete `fetchWithTimeout`, call `safeFetch` at
     all three call sites. Run `checkUrl` on the user's URL at the top of
     `importRecipeFromUrl` and, when unsafe, return `{ error: "That link
     points somewhere Marshee can't open. Try a regular recipe website." }`.
     In the existing outer catch, an `UnsafeUrlError` (for example a
     redirect or Pinterest outbound link to an internal address) returns the
     same message; every other error keeps today's message.
4. **Verification.** The gauntlet above, plus a scratch script (in the
   session scratchpad, not the repo) that calls `importRecipeFromUrl` via
   `tsx` with `http://169.254.169.254/latest/meta-data/`, `http://localhost`,
   `http://127.0.0.1:3000`, `http://[::1]/`, `http://user:pw@example.com/`
   (all refused with the friendly message) and one real public recipe blog
   page with JSON-LD (imports with a title and ingredients). The `server-only`
   import blocks plain `tsx`; run the script with
   `node --conditions=react-server --import tsx`. Also one redirect check:
   a public URL that redirects (for example `http://` to `https://` of the
   same blog) still imports.
5. **Evidence required:** full output of every gauntlet command (test counts
   for both timezones), the scratch script output, `wc -l` of each new file,
   the final diff stat.
6. **Done criteria:** Vision re-runs the gauntlet and the refusal checks
   himself and finds no way to reach an unsafe address (first request,
   redirect, Pinterest outbound link, DNS answer).

## Log

- 2026-11-26: branch `claude/family-copies-pr1-link-import` cut from
  `origin/main`. C1 written.
- 2026-11-26: Stark reported C1 DONE: tsc, eslint, build clean; `npm test`
  2290 pass; TZ=UTC 2280 pass, 0 fail. All eight refusal URLs (including
  `http://127.0.0.1.nip.io/`, a public name resolving to loopback) return
  the friendly message. His positive control hit bot 403s.
- 2026-11-26: Fury's positive control: plain `fetch` on main's code also gets
  403 from allrecipes from this machine (not a regression).
  `http://pinchofyum.com/the-best-soft-chocolate-chip-cookies` (301 to https)
  imports "The Best Soft Chocolate Chip Cookies", 9 ingredients;
  `https://www.recipetineats.com/chicken-stir-fry/` imports 16 ingredients.
- 2026-11-26: Captain PASS (notes only). His STRUCTURE.md entry "Server
  fetches of user-supplied URLs (mission-86)" added under One source of truth.
- 2026-11-26: Vision pass 1 BLOCKED, one blocker: `origin/main` gained PR #134
  (TikTok caption fix), whose `readTikTokCaption` calls `fetchWithTimeout`
  twice, one of them on the user's own link, and conflicts with this branch.
  Security probes otherwise clean (44 odd addresses, DNS answers, redirects,
  caps, bombs, timeouts). Notes: SIIT `::ffff:0:0/96`, Teredo `2001::/32`,
  `100::/64` and IPv4 documentation ranges pass `isSafeIpAddress` (cheap
  hardening, folded into C2).

## Contract C2: merge main, cover the TikTok page fetch, harden ranges

1. **Objective:** the branch contains `origin/main` and no plain `fetch`
   remains in link import.
2. **Boundaries.** May touch: `src/lib/recipeUrlImport.ts` (merge
   resolution), `src/lib/urlSafety.ts`, `src/lib/urlSafety.test.ts`, and the
   merge commit itself (files main changed come in as main wrote them). Must
   not touch: anything else, `package.json`.
3. **Work.** `git merge origin/main` (no rebase: the branch's commit is
   already gated). Resolve `recipeUrlImport.ts`: keep main's
   `readTikTokCaption` and its wording, replace both of its calls with
   `safeFetch(oembedUrl)` and `safeFetch(pageUrl, { headers:
   BROWSER_HEADERS })`, keep `fetchWithTimeout` deleted. In `urlSafety.ts`
   also refuse `::ffff:0:0/96` (SIIT, judged by inner IPv4 or simply
   refused), `2001::/32` (Teredo), `100::/64` (discard), and IPv4
   192.0.2/24, 198.51.100/24, 203.0.113/24; add tests for each edge.
4. **Verification.** The full gauntlet; `grep -nE "fetchWithTimeout|[^e]fetch\("
   src/lib/recipeUrlImport.ts` finds no plain fetch; the scratch `run.mts`
   refusal list and the two positive blogs again.
5. **Evidence:** every command's output, the merge commit hash, `git show
   --stat` of it.
6. **Done:** Vision re-gates the merge diff and the hardening.
- 2026-11-26: Stark reported C2 DONE: merge `d3f3a89` (only conflict
  `recipeUrlImport.ts`, both `readTikTokCaption` fetches now `safeFetch`),
  hardening `4fa3172`. Gauntlet green both timezones (2290 / 2280+10 skipped),
  no plain fetch left, refusals and both positive blogs re-proven. Note: C2's
  "`::ffff:0:0/96` (SIIT)" was Fury's wrong prefix (that is IPv4-mapped);
  Stark correctly refused the real SIIT form `::ffff:0:a.b.c.d`.
