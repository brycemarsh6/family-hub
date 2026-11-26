// Decides whether a server-side fetch may go to a given address. Pure code
// (no network, no server-only) so node:test can import it. The actual
// connection is made by src/lib/safeFetch.ts, which re-checks every address
// the DNS lookup returns with isSafeIpAddress.

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

function parseIpv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    nums.push(n);
  }
  return nums;
}

function isSafeIpv4Parts([a, b, c]: number[]): boolean {
  if (a === 0) return false; // 0.0.0.0/8
  if (a === 10) return false; // private
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 0 && c === 0) return false; // 192.0.0.0/24
  if (a === 192 && b === 168) return false; // private
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a >= 224) return false; // multicast, reserved, broadcast
  return true;
}

/** Expand an IPv6 address into its 8 sixteen-bit groups, or null. */
function parseIpv6(ip: string): number[] | null {
  let text = ip;
  const zone = text.indexOf("%");
  if (zone !== -1) text = text.slice(0, zone);
  // A trailing dotted IPv4 becomes two hex groups.
  const lastColon = text.lastIndexOf(":");
  if (lastColon === -1) return null;
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIpv4(tail);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    text = `${text.slice(0, lastColon + 1)}${hi}:${lo}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const toGroups = (s: string): number[] | null => {
    if (s === "") return [];
    const out: number[] = [];
    for (const g of s.split(":")) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };
  const head = toGroups(halves[0]);
  if (!head) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const rest = toGroups(halves[1]);
  if (!rest) return null;
  const fill = 8 - head.length - rest.length;
  if (fill < 1) return null;
  return [...head, ...new Array<number>(fill).fill(0), ...rest];
}

function innerIpv4(hi: number, lo: number): number[] {
  return [hi >> 8, hi & 255, lo >> 8, lo & 255];
}

function isSafeIpv6(g: number[]): boolean {
  const firstFiveZero = g.slice(0, 5).every((x) => x === 0);
  // :: , ::1 and the old IPv4-compatible ::a.b.c.d form (all ::/96)
  if (firstFiveZero && g[5] === 0) return false;
  // IPv4-mapped ::ffff:a.b.c.d, judged by the inner IPv4
  if (firstFiveZero && g[5] === 0xffff) {
    return isSafeIpv4Parts(innerIpv4(g[6], g[7]));
  }
  // NAT64 64:ff9b::/96, judged by the inner IPv4
  if (
    g[0] === 0x64 && g[1] === 0xff9b &&
    g.slice(2, 6).every((x) => x === 0)
  ) {
    return isSafeIpv4Parts(innerIpv4(g[6], g[7]));
  }
  if (g[0] === 0x64 && g[1] === 0xff9b) return false; // local-use NAT64
  // 6to4 2002::/16 embeds an IPv4 in groups 1 and 2
  if (g[0] === 0x2002) return isSafeIpv4Parts(innerIpv4(g[1], g[2]));
  if ((g[0] & 0xfe00) === 0xfc00) return false; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return false; // fec0::/10 site-local
  if ((g[0] & 0xff00) === 0xff00) return false; // ff00::/8 multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentation
  return true;
}

/** True only for a well-formed public IPv4 or IPv6 address. */
export function isSafeIpAddress(ip: string): boolean {
  let text = ip.trim();
  if (text.startsWith("[") && text.endsWith("]")) text = text.slice(1, -1);
  if (text.includes(":")) {
    const groups = parseIpv6(text);
    return groups ? isSafeIpv6(groups) : false;
  }
  const v4 = parseIpv4(text);
  return v4 ? isSafeIpv4Parts(v4) : false;
}

/** Is this URL hostname an IP literal (as opposed to a name)? */
function looksLikeIpLiteral(host: string): boolean {
  return host.includes(":") || /^[\d.]+$/.test(host) || /^0x[0-9a-f.]*$/i.test(host);
}

export function checkUrl(input: URL | string): UrlCheck {
  let url: URL;
  try {
    url = typeof input === "string" ? new URL(input.trim()) : input;
  } catch {
    return { ok: false, reason: "not a valid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "only http and https links are allowed" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "links with a login in them are not allowed" };
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    return { ok: false, reason: "that port is not allowed" };
  }
  let host = url.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  while (host.endsWith(".")) host = host.slice(0, -1);
  if (!host) return { ok: false, reason: "no host" };
  if (host === "localhost" || host.endsWith(".localhost")) {
    return { ok: false, reason: "localhost is not allowed" };
  }
  if (looksLikeIpLiteral(host) && !isSafeIpAddress(host)) {
    return { ok: false, reason: "that address is not public" };
  }
  return { ok: true, url };
}
