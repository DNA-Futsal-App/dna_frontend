import { NextRequest, NextResponse } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  if (!path?.length || path.some((part) => !["contexts", "context", "candidates", "ballot"].includes(part))) {
    return NextResponse.json(
      { code: "COACH_VOTING_ROUTE_NOT_FOUND", detail: "Rota de votação inválida." },
      { status: 404 },
    );
  }

  if (path.length !== 1 || (request.method === "POST" && path[0] !== "ballot")) {
    return NextResponse.json(
      { code: "COACH_VOTING_ROUTE_NOT_FOUND", detail: "Rota de votação inválida." },
      { status: 404 },
    );
  }

  const suffix = encodeURIComponent(path[0]);
  const body = request.method === "GET" ? undefined : await request.text();
  const response = await proxyAuthenticated(
    request,
    `/api/v1/awards/coach-category-voting/${suffix}${request.nextUrl.search}`,
    { method: request.method, body: body || undefined },
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const GET = forward;
export const POST = forward;
