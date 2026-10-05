import { NextRequest } from "next/server";
import { proxyAuthenticated } from "@/lib/backend";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(
  request: NextRequest,
  context: RouteContext,
) {
  const { path } = await context.params;
  const suffix = path.map(encodeURIComponent).join("/");
  const query = request.nextUrl.search;
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  return proxyAuthenticated(
    request,
    `/api/v1/awards/coach-access/${suffix}${query}`,
    {
      method: request.method,
      body: body || undefined,
    },
  );
}

export const GET = proxy;
export const POST = proxy;
