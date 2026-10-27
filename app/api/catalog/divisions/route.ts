import { NextRequest, NextResponse } from "next/server";
import { demoEnabled, proxyPublic } from "@/lib/backend";

export async function GET(request: NextRequest) {
  const season =
    request.nextUrl.searchParams.get("season") ??
    String(new Date().getFullYear());
  const title = request.nextUrl.searchParams.get("title")?.trim();

  if (demoEnabled() && !title) {
    return NextResponse.json([
      { id: "3", name: "A1" },
      { id: "4", name: "A2" },
    ]);
  }

  const query = new URLSearchParams({ season });
  if (title) query.set("title", title);

  return proxyPublic(
    `/api/v1/public/catalog/divisions?${query.toString()}`,
  );
}