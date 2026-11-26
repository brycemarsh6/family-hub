import "server-only";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import type { IncomingMessage } from "node:http";
import type { LookupFunction } from "node:net";
import zlib from "node:zlib";
import { checkUrl, isSafeIpAddress } from "@/lib/urlSafety";

// A fetch for addresses that came from a person (recipe links). Three jobs:
//   1. Refuse unsafe destinations (internal networks, cloud metadata) on the
//      first request AND on every redirect, which is followed by hand.
//   2. Close DNS rebinding: the connection's own DNS lookup is the one that
//      gets checked, and the connection goes to exactly an address that
//      passed. (Resolve-check-then-fetch would resolve twice.)
//   3. Cap time and size so one link can't hang or flood the server.

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

export type SafeFetchOptions = {
  headers?: Record<string, string>;
  /** Whole chain, redirects included. Default 10 s. */
  timeoutMs?: number;
  /** Decompressed body size; over this is a refusal, not a cut. Default 2 MB. */
  maxBytes?: number;
  /** Default 3. */
  maxRedirects?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Resolves the name, refuses if ANY answer is unsafe, and hands the
 * connection one checked address. */
const checkedLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) {
      callback(err, "", 4);
      return;
    }
    if (
      addresses.length === 0 ||
      addresses.some((a) => !isSafeIpAddress(a.address))
    ) {
      callback(new UnsafeUrlError(`${hostname} resolves to a blocked address`), "", 4);
      return;
    }
    const wantsAll = (options as { all?: boolean }).all === true;
    if (wantsAll) {
      (callback as unknown as (
        e: null,
        a: dns.LookupAddress[],
      ) => void)(null, addresses);
    } else {
      callback(null, addresses[0].address, addresses[0].family);
    }
  });
};

type RawResponse = {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
};

function requestOnce(
  url: URL,
  headers: Record<string, string>,
  maxBytes: number,
  signal: AbortSignal,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      { method: "GET", headers, lookup: checkedLookup, signal, agent: false },
      (res: IncomingMessage) => {
        const status = res.statusCode ?? 0;
        if (REDIRECT_STATUSES.has(status)) {
          res.destroy();
          resolve({ status, headers: res.headers, body: Buffer.alloc(0) });
          return;
        }

        const encoding = String(res.headers["content-encoding"] ?? "")
          .toLowerCase()
          .trim();
        let stream: NodeJS.ReadableStream = res;
        if (encoding === "gzip" || encoding === "x-gzip") {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === "deflate") {
          stream = res.pipe(zlib.createInflate());
        } else if (encoding === "br") {
          stream = res.pipe(zlib.createBrotliDecompress());
        } else if (encoding && encoding !== "identity") {
          res.destroy();
          reject(new Error(`unsupported content-encoding ${encoding}`));
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;
        const fail = (e: Error) => {
          res.destroy();
          reject(e);
        };
        res.on("error", fail);
        stream.on("error", fail);
        stream.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > maxBytes) {
            fail(new Error("response too large"));
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () =>
          resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const headers: Record<string, string> = {
    "Accept-Encoding": "gzip, deflate, br",
    ...options.headers,
  };
  const signal = AbortSignal.timeout(timeoutMs);

  let current = checkUrl(url);
  for (let hops = 0; ; hops++) {
    if (!current.ok) throw new UnsafeUrlError(current.reason);
    let raw: RawResponse;
    try {
      raw = await requestOnce(current.url, headers, maxBytes, signal);
    } catch (e) {
      // The lookup's refusal can arrive wrapped in a socket error.
      const cause = (e as { cause?: unknown }).cause;
      if (e instanceof UnsafeUrlError) throw e;
      if (cause instanceof UnsafeUrlError) throw cause;
      throw e;
    }

    if (REDIRECT_STATUSES.has(raw.status)) {
      const location = raw.headers.location;
      if (!location) throw new Error("redirect without a Location");
      if (hops >= maxRedirects) throw new UnsafeUrlError("too many redirects");
      let next: URL;
      try {
        next = new URL(location, current.url);
      } catch {
        throw new UnsafeUrlError("redirect to an invalid address");
      }
      current = checkUrl(next);
      continue;
    }

    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(raw.headers)) {
      if (value === undefined) continue;
      // The body is already decompressed and buffered, so these would lie.
      if (key === "content-encoding" || key === "content-length") continue;
      if (Array.isArray(value)) {
        for (const v of value) responseHeaders.append(key, v);
      } else {
        responseHeaders.set(key, value);
      }
    }
    const noBody = raw.status === 204 || raw.status === 205 || raw.status === 304;
    return new Response(noBody ? null : new Uint8Array(raw.body), {
      status: raw.status,
      headers: responseHeaders,
    });
  }
}
