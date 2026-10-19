import { NextRequest, NextResponse } from "next/server";
import { demoEnabled, proxyPublic } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const season =
    request.nextUrl.searchParams.get("season") ??
    String(new Date().getFullYear());

  if (demoEnabled()) {
    return NextResponse.json([
      { id: "3", name: "A1" },
      { id: "4", name: "A2" },
    ]);
  }

  const query = new URLSearchParams({ season });
  const title = request.nextUrl.searchParams.get("title");
  if (title) query.set("title", title);
  return proxyPublic(`/api/v1/public/catalog/divisions?${query}`);
}