import { NextRequest, NextResponse } from "next/server";
import { proxyAuthenticated, proxyPublic } from "@/lib/backend";

type RouteContext = { params: Promise<{ path: string[] }> };
const uuid = "[0-9a-fA-F-]{36}";
const contexts = new RegExp(`^editions/${uuid}/contexts$`);
const board = new RegExp(`^editions/${uuid}/board$`);
const media = new RegExp(`^editions/${uuid}/media/${uuid}$`);
const myVote = new RegExp(`^editions/${uuid}/my-vote$`);
const vote = new RegExp(`^editions/${uuid}/vote$`);

async function forward(request: NextRequest, context: RouteContext, method: "GET" | "POST") {
  const { path } = await context.params;
  const suffix = path?.join("/") ?? "";
  const allowedGet = suffix === "editions" || contexts.test(suffix) || board.test(suffix) || media.test(suffix) || myVote.test(suffix);
  if ((method === "GET" && !allowedGet) || (method === "POST" && !vote.test(suffix))) {
    return NextResponse.json({ code: "INVALID_POPULAR_ROUTE", detail: "Rota não encontrada." }, { status: 404 });
  }
  if (method === "POST") {
    // A sessão fica em cookies httpOnly: negar escrita cross-origin.
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    if (origin !== request.nextUrl.origin || (fetchSite && fetchSite !== "same-origin")) {
      return NextResponse.json({ code: "CROSS_ORIGIN_FORBIDDEN", detail: "Origem inválida." }, { status: 403 });
    }
  }
  const query = method === "GET" ? request.nextUrl.search : "";
  const body = method === "POST" ? await request.text() : undefined;
  const init = { method, body };
  if (myVote.test(suffix) || method === "POST") {
    const response = await proxyAuthenticated(request,
      `/api/v1/awards/popular-voting/${suffix}${query}`, init);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const response = await proxyPublic(`/api/v1/public/awards/popular-voting/${suffix}${query}`, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function GET(request: NextRequest, context: RouteContext) {
  return forward(request, context, "GET");
}
export function POST(request: NextRequest, context: RouteContext) {
  return forward(request, context, "POST");
}
