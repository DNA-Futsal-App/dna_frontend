import { NextRequest, NextResponse } from "next/server";
import { proxyAuthenticated, proxyPublic } from "@/lib/backend";
import { resolvePopularVotingRoute, validPopularVotingOrigin } from "@/lib/popular-voting-route-guard";

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: RouteContext, method: "GET" | "POST") {
  const { path } = await context.params;
  const route = resolvePopularVotingRoute(method, path);
  if (!route) {
    // Report method and URL path to make mismatches observable in Network > Response.
    // Do not log cookies, JWTs, request bodies, or other credentials.
    const requestedPath = `/api/popular-voting/${(path ?? []).join("/")}`.slice(0, 250);
    console.warn("[popular-voting] BFF route rejected", { method, path: requestedPath });
    return NextResponse.json({
      code: "INVALID_POPULAR_ROUTE",
      detail: "O endereço da votação não corresponde a uma rota permitida.",
      method,
      path: requestedPath,
    }, { status: 404 });
  }
  if (method === "POST") {
    // Our auth session uses httpOnly cookies; prevent cross-site writes.
    // Do not compare Origin to request.nextUrl.origin behind a TLS reverse proxy.
    if (!validPopularVotingOrigin(request.headers, request.nextUrl.origin, process.env.DNA_PUBLIC_ORIGIN)) {
      return NextResponse.json({
        code: "CROSS_ORIGIN_FORBIDDEN",
        detail: "Origem inválida para registrar o voto.",
      }, { status: 403 });
    }
  }
  const query = method === "GET" ? request.nextUrl.search : "";
  const body = method === "POST" ? await request.text() : undefined;
  const init = { method, body };
  if (route.kind === "my-vote" || route.kind === "vote") {
    const response = await proxyAuthenticated(request,
      `/api/v1/awards/popular-voting/${route.suffix}${query}`, init);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const response = await proxyPublic(`/api/v1/public/awards/popular-voting/${route.suffix}${query}`, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function GET(request: NextRequest, context: RouteContext) {
  return forward(request, context, "GET");
}
export function POST(request: NextRequest, context: RouteContext) {
  return forward(request, context, "POST");
}
