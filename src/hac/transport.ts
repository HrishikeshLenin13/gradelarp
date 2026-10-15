import { lookup as dnsLookup } from "node:dns";
import { promisify } from "node:util";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { request as httpsRequest } from "node:https";
import { CookieJar } from "tough-cookie";
import { HacError } from "./types";
const lookup = promisify(dnsLookup);
const blocked = new BlockList();
for (const [ip, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(ip, prefix, "ipv4");
for (const [ip, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const)
  blocked.addSubnet(ip, prefix, "ipv6");
const global6 = new BlockList();
global6.addSubnet("2000::", 3, "ipv6");
export function isPublicAddress(ip: string) {
  const family = isIP(ip);
  return family === 4
    ? !blocked.check(ip, "ipv4")
    : family === 6 && global6.check(ip, "ipv6") && !blocked.check(ip, "ipv6");
}
export function normalizePortal(raw: string): string {
  let url: URL;
  try {
    const value = raw.trim();
    url = new URL(
      /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`,
    );
  } catch {
    throw new HacError(
      "PORTAL",
      "Enter your district’s official HTTPS HAC address.",
      400,
    );
  }
  const safeQuery = [...url.searchParams].every(
    ([key, value]) =>
      key.toLowerCase() === "returnurl" &&
      value.toLowerCase().startsWith("/homeaccess") &&
      !value.startsWith("//") &&
      !value.includes("\\"),
  );
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    (url.search && !safeQuery) ||
    url.hash ||
    isIP(url.hostname.replace(/^\[|\]$/g, "")) ||
    !url.hostname.includes(".") ||
    url.hostname.endsWith(".") ||
    !/^\/(?:HomeAccess(?:\/(?:Account\/LogOn)?)?\/?)?$/i.test(url.pathname)
  )
    throw new HacError(
      "PORTAL",
      "Use the official HTTPS HAC portal address, without credentials, unrelated parameters, or a custom port.",
      400,
    );
  return `${url.origin}/HomeAccess`;
}
export function validatePortalRequest(origin: string, input: string | URL) {
  const url = new URL(input, origin),
    path = url.pathname.toLowerCase();
  if (
    url.origin !== origin ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !(path === "/homeaccess" || path.startsWith("/homeaccess/")) ||
    url.hash ||
    [...url.searchParams.keys()].some((key) =>
      /^(?:user|username|pass|password|access_token|authorization)$/i.test(key),
    )
  )
    throw new HacError(
      "PORTAL_REDIRECT",
      "The district requires an external or interactive sign-in. Open its official portal to complete that step.",
      409,
    );
  return url;
}
export type HttpPage = {
  url: string;
  status: number;
  html: string;
  location?: string;
};
export interface PortalTransport {
  page(
    url: string,
    options?: { body?: URLSearchParams; signal?: AbortSignal },
  ): Promise<HttpPage>;
  destroy(): Promise<void>;
}
export class DirectPortalTransport implements PortalTransport {
  private jar = new CookieJar(undefined, {
    rejectPublicSuffixes: true,
    prefixSecurity: "strict",
  });
  readonly origin: string;
  constructor(portal: string) {
    this.origin = new URL(normalizePortal(portal)).origin;
  }
  async page(
    input: string,
    options: { body?: URLSearchParams; signal?: AbortSignal } = {},
  ): Promise<HttpPage> {
    let url = new URL(input, this.origin);
    let body = options.body;
    const signal = options.signal ?? AbortSignal.timeout(30_000);
    for (let redirects = 0; redirects <= 5; redirects++) {
      url = validatePortalRequest(this.origin, url);
      signal.throwIfAborted();
      const addresses = await Promise.race([
        lookup(url.hostname, { all: true, verbatim: true }),
        new Promise<never>((_, reject) => {
          if (signal.aborted)
            reject(
              new HacError(
                "TIMEOUT",
                "HAC took too long to respond. Try again.",
                504,
              ),
            );
          else
            signal.addEventListener(
              "abort",
              () =>
                reject(
                  new HacError(
                    "TIMEOUT",
                    "HAC took too long to respond. Try again.",
                    504,
                  ),
                ),
              { once: true },
            );
        }),
      ]).finally(() => {
        if (onAbort) signal.removeEventListener("abort", onAbort);
      });
      if (
        !addresses.length ||
        addresses.some((a) => !isPublicAddress(a.address))
      )
        throw new HacError(
          "DESTINATION",
          "This portal does not resolve exclusively to public school-server addresses.",
          400,
        );
      const address = addresses.find((a) => a.family === 4) ?? addresses[0];
      const pinned: LookupFunction = (_host, _options, callback) =>
        callback(null, address.address, address.family);
      const cookie = await this.jar.getCookieString(url.href);
      const result = await new Promise<{
        status: number;
        html: string;
        cookies: string[];
        location?: string;
      }>((resolve, reject) => {
        const payload = body?.toString();
        const req = httpsRequest(
          url,
          {
            method: body ? "POST" : "GET",
            agent: false,
            lookup: pinned,
            ...{ autoSelectFamily: false },
            servername: url.hostname,
            rejectUnauthorized: true,
            signal,
            headers: {
              Accept: "text/html",
              "Accept-Encoding": "identity",
              "User-Agent": "Gradelarp/1.0 (personal academic dashboard)",
              ...(cookie ? { Cookie: cookie } : {}),
              ...(payload
                ? {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": String(Buffer.byteLength(payload)),
                    Origin: this.origin,
                    Referer: `${this.origin}/HomeAccess/Account/LogOn`,
                  }
                : {}),
            },
          },
          (res) => {
            const chunks: Buffer[] = [];
            let size = 0;
            if (
              res.headers["content-encoding"] &&
              res.headers["content-encoding"] !== "identity"
            ) {
              req.destroy();
              reject(
                new HacError(
                  "ENCODING",
                  "The portal returned an unsupported response encoding.",
                  502,
                ),
              );
              return;
            }
            res.on("data", (chunk) => {
              size += chunk.length;
              if (size > 3_000_000) {
                req.destroy();
                reject(
                  new HacError(
                    "PAGE_SIZE",
                    "The district response exceeds the supported size.",
                    502,
                  ),
                );
              } else chunks.push(Buffer.from(chunk));
            });
            res.on("error", () =>
              reject(
                new HacError(
                  "NETWORK",
                  "The HAC response was interrupted. Try again.",
                  502,
                ),
              ),
            );
            res.on("end", () =>
              resolve({
                status: res.statusCode ?? 502,
                html: Buffer.concat(chunks).toString("utf8"),
                cookies: res.headers["set-cookie"] ?? [],
                location: res.headers.location,
              }),
            );
          },
        );
        let timedOut = false;
        req.setTimeout(12_000, () => {
          timedOut = true;
          req.destroy();
        });
        req.on("error", (error) =>
          reject(
            signal.aborted || timedOut
              ? new HacError(
                  "TIMEOUT",
                  "HAC took too long to respond. Try again.",
                  504,
                )
              : error,
          ),
        );
        req.end(payload);
      });
      for (const c of result.cookies) {
        try {
          await this.jar.setCookie(c, url.href);
        } catch {
          /* Reject invalid cookie scope; never expose values. */
        }
      }
      if (
        [301, 302, 303, 307, 308].includes(result.status) &&
        result.location
      ) {
        if (body && [307, 308].includes(result.status))
          throw new HacError(
            "LOGIN_REDIRECT",
            "The portal requires an unsupported credential redirect. Use the official portal.",
            409,
          );
        url = new URL(result.location, url);
        body = undefined;
        continue;
      }
      if (result.status === 429)
        throw new HacError(
          "UPSTREAM_RATE_LIMIT",
          "The district is limiting requests. Wait before trying again.",
          429,
        );
      if (result.status >= 400)
        throw new HacError(
          "UPSTREAM",
          "The district portal returned an error. Your saved grades are unchanged.",
          502,
        );
      return { url: url.href, status: result.status, html: result.html };
    }
    throw new HacError(
      "REDIRECT_LIMIT",
      "The district sign-in redirected too many times. Use the official portal.",
      409,
    );
  }
  async destroy() {
    await this.jar.removeAllCookies();
  }
}
