/**
 * Allowlist the BFF routes without relying on a single regex matching the entire URL.
 * The public pages receive UUIDs from the API; only canonical UUIDs are forwarded.
 */
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export type PopularVotingRouteKind =
  | "editions" | "contexts" | "board" | "media" | "my-vote" | "vote";

export type PopularVotingRoute = { suffix: string; kind: PopularVotingRouteKind };

export function resolvePopularVotingRoute(
  method: "GET" | "POST",
  path: readonly string[] | undefined,
): PopularVotingRoute | null {
  if (!path || path.length === 0) return null;

  // A reverse proxy can preserve a trailing slash. Do not remove internal
  // segments, accept arbitrary paths, or change the route's authentication.
  const parts = path.join("/").replace(/\/+$/, "").split("/");
  if (parts.length === 1 && parts[0] === "editions" && method === "GET") {
    return { suffix: "editions", kind: "editions" };
  }
  if (parts[0] !== "editions" || !UUID.test(parts[1] ?? "")) return null;

  if (parts.length === 3) {
    const kind = parts[2];
    if (method === "GET" && (kind === "contexts" || kind === "board" || kind === "my-vote")) {
      return { suffix: parts.join("/"), kind };
    }
    if (method === "POST" && kind === "vote") {
      return { suffix: parts.join("/"), kind: "vote" };
    }
  }
  if (parts.length === 4 && method === "GET" && parts[2] === "media" && UUID.test(parts[3])) {
    return { suffix: parts.join("/"), kind: "media" };
  }
  return null;
}

/**
 * Check the browser Origin against the request Host, not NextRequest.nextUrl.origin.
 * Behind a TLS-terminating proxy nextUrl.origin can be an internal HTTP URL.
 * Never trust X-Forwarded-Host supplied by an untrusted client.
 */
export function validPopularVotingOrigin(
  headers: Headers,
  serverOrigin: string,
  configuredOrigin?: string,
): boolean {
  const origin = headers.get("origin");
  const fetchSite = headers.get("sec-fetch-site");
  if (!origin || (fetchSite !== null && fetchSite !== "same-origin")) return false;

  try {
    const source = new URL(origin);
    if ((source.protocol !== "https:" && source.protocol !== "http:") || source.origin !== origin) {
      return false;
    }
    if (configuredOrigin) {
      const expected = new URL(configuredOrigin);
      return source.origin === expected.origin;
    }
    const host = headers.get("host");
    if (host) return source.host.toLowerCase() === host.trim().toLowerCase();
    return source.origin === serverOrigin;
  } catch {
    return false;
  }
}
