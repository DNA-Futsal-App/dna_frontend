import { NextRequest, NextResponse } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forward(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "POST" | "PUT",
) {
  const { path } = await context.params;

  if (!path?.length) {
    return NextResponse.json(
      {
        title: "Rota de inscrição inválida",
        status: 404,
        detail: "O recurso de inscrição solicitado não existe.",
        code: "AWARD_REGISTRATION_ROUTE_NOT_FOUND",
      },
      { status: 404 },
    );
  }

  const suffix = path.map(encodeURIComponent).join("/");
  const body = method === "GET" ? undefined : await request.text();
  const timeoutMs = suffix.endsWith("/complete-upload") ? 300_000 : undefined;

  return proxyAuthenticated(
    request,
    `/api/v1/awards/registrations/${suffix}${request.nextUrl.search}`,
    { method, body: body || undefined, timeoutMs },
  );
}

export function GET(request: NextRequest, context: RouteContext) {
  return forward(request, context, "GET");
}

export function POST(request: NextRequest, context: RouteContext) {
  return forward(request, context, "POST");
}

export function PUT(request: NextRequest, context: RouteContext) {
  return forward(request, context, "PUT");
}
