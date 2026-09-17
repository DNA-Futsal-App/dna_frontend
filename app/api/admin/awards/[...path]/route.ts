import { NextRequest, NextResponse } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function forward(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "POST" | "PATCH" | "DELETE",
) {
  const { path } = await context.params;

  if (!path?.length) {
    return NextResponse.json(
      {
        title: "Rota administrativa inválida",
        status: 404,
        detail: "O recurso administrativo solicitado não existe.",
        code: "ADMIN_AWARD_ROUTE_NOT_FOUND",
      },
      { status: 404 },
    );
  }

  const suffix = path
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const query = request.nextUrl.search;

  const body =
    method === "GET" || method === "DELETE"
      ? undefined
      : await request.text();

  return proxyAuthenticated(
    request,
    `/api/v1/admin/awards/${suffix}${query}`,
    {
      method,
      body: body || undefined,
    },
  );
}

export function GET(
  request: NextRequest,
  context: RouteContext,
) {
  return forward(request, context, "GET");
}

export function POST(
  request: NextRequest,
  context: RouteContext,
) {
  return forward(request, context, "POST");
}

export function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  return forward(request, context, "PATCH");
}

export function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  return forward(request, context, "DELETE");
}
